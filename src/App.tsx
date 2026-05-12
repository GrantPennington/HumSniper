import { useEffect, useRef, useState } from 'react';

type FrequencyPeak = {
  frequencyHz: number;
  magnitude: number;
};

type HumStatus = 'No stable hum' | 'Possible hum' | 'Likely persistent hum';

type HumCandidate = {
  frequencyHz: number | null;
  confidencePercent: number;
  status: HumStatus;
  nearestMainsBandHz: number | null;
};

type PersistentCandidate = {
  frequencyHz: number;
  averageStrength: number;
  confidencePercent: number;
  nearestMainsBandHz: number | null;
  excludedByRumbleFilter: boolean;
};

type MainsBandReading = {
  frequencyHz: number;
  intensity: number;
  highlighted: boolean;
};

type DetectionSettings = {
  rumbleCutoffHz: number;
  minimumPersistencePercent: number;
  minimumAverageStrength: number;
};

type PersistenceState = {
  smoothedBins: number[];
  historyFrames: number[][];
  historySums: number[];
  frameIndex: number;
  sampleCount: number;
  lastSampleTimeMs: number;
};

type AudioResources = {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  stream: MediaStream;
  animationFrameId: number | null;
};

const FFT_SIZE = 4096;
const MAX_DISPLAY_FREQUENCY = 300;
const PEAK_COUNT = 5;
const PERSISTENT_CANDIDATE_COUNT = 5;
const BAR_COUNT = 40;
const SMOOTHING_DECAY = 0.82;
const PERSISTENCE_SAMPLE_INTERVAL_MS = 120;
const PERSISTENCE_WINDOW_SAMPLES = 32;
const MAINS_HUM_BANDS = [50, 60, 100, 120, 150, 180, 240] as const;

const DETECTION_PRESETS = {
  Sensitive: {
    rumbleCutoffHz: 12,
    minimumPersistencePercent: 24,
    minimumAverageStrength: 16,
  },
  Balanced: {
    rumbleCutoffHz: 20,
    minimumPersistencePercent: 38,
    minimumAverageStrength: 24,
  },
  Strict: {
    rumbleCutoffHz: 30,
    minimumPersistencePercent: 56,
    minimumAverageStrength: 36,
  },
} satisfies Record<string, DetectionSettings>;

const emptyCandidate: HumCandidate = {
  frequencyHz: null,
  confidencePercent: 0,
  status: 'No stable hum',
  nearestMainsBandHz: null,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function findNearestMainsBandWithinTolerance(frequencyHz: number, toleranceHz: number) {
  let nearestBandHz: number | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const bandHz of MAINS_HUM_BANDS) {
    const distance = Math.abs(bandHz - frequencyHz);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestBandHz = bandHz;
    }
  }

  return nearestDistance <= toleranceHz ? nearestBandHz : null;
}

function classifyHumCandidate(confidencePercent: number): HumStatus {
  if (confidencePercent >= 68) {
    return 'Likely persistent hum';
  }

  if (confidencePercent >= 38) {
    return 'Possible hum';
  }

  return 'No stable hum';
}

function App() {
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Microphone is inactive. Start listening to begin local analysis.',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<FrequencyPeak[]>([]);
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: BAR_COUNT }, () => 0));
  const [humCandidate, setHumCandidate] = useState<HumCandidate>(emptyCandidate);
  const [persistentCandidates, setPersistentCandidates] = useState<PersistentCandidate[]>([]);
  const [settings, setSettings] = useState<DetectionSettings>(DETECTION_PRESETS.Balanced);
  const [mainsBands, setMainsBands] = useState<MainsBandReading[]>(
    MAINS_HUM_BANDS.map((frequencyHz) => ({
      frequencyHz,
      intensity: 0,
      highlighted: false,
    })),
  );
  const audioRef = useRef<AudioResources | null>(null);
  const persistenceRef = useRef<PersistenceState | null>(null);
  const settingsRef = useRef<DetectionSettings>(DETECTION_PRESETS.Balanced);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    return () => {
      void stopListening();
    };
  }, []);

  const resetAnalysisState = () => {
    persistenceRef.current = null;
    setPeaks([]);
    setBars(Array.from({ length: BAR_COUNT }, () => 0));
    setHumCandidate(emptyCandidate);
    setPersistentCandidates([]);
    setMainsBands(
      MAINS_HUM_BANDS.map((frequencyHz) => ({
        frequencyHz,
        intensity: 0,
        highlighted: false,
      })),
    );
  };

  const stopListening = async () => {
    const audio = audioRef.current;

    if (!audio) {
      setIsListening(false);
      setStatusMessage('Microphone is inactive. Start listening to begin local analysis.');
      resetAnalysisState();
      return;
    }

    if (audio.animationFrameId !== null) {
      cancelAnimationFrame(audio.animationFrameId);
    }

    audio.stream.getTracks().forEach((track) => track.stop());
    audioRef.current = null;
    setIsListening(false);
    resetAnalysisState();
    setStatusMessage('Microphone is inactive. Audio capture has been fully released.');

    await audio.audioContext.close();
  };

  const applyPreset = (preset: DetectionSettings) => {
    setSettings(preset);
  };

  const startListening = async () => {
    if (isListening) {
      return;
    }

    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const binWidth = audioContext.sampleRate / analyser.fftSize;
      const maxBin = Math.min(
        frequencyData.length - 1,
        Math.floor(MAX_DISPLAY_FREQUENCY / binWidth),
      );

      persistenceRef.current = {
        smoothedBins: Array.from({ length: maxBin + 1 }, () => 0),
        historyFrames: Array.from({ length: PERSISTENCE_WINDOW_SAMPLES }, () =>
          Array.from({ length: maxBin + 1 }, () => 0),
        ),
        historySums: Array.from({ length: maxBin + 1 }, () => 0),
        frameIndex: 0,
        sampleCount: 0,
        lastSampleTimeMs: 0,
      };

      const resources: AudioResources = {
        audioContext,
        analyser,
        stream,
        animationFrameId: null,
      };
      audioRef.current = resources;

      const updateAnalysis = (timestampMs: number) => {
        if (!audioRef.current || !persistenceRef.current) {
          return;
        }

        analyser.getByteFrequencyData(frequencyData);
        const persistence = persistenceRef.current;

        for (let binIndex = 0; binIndex <= maxBin; binIndex += 1) {
          const rawMagnitude = frequencyData[binIndex] ?? 0;
          const previousMagnitude = persistence.smoothedBins[binIndex] ?? 0;
          persistence.smoothedBins[binIndex] =
            previousMagnitude * SMOOTHING_DECAY + rawMagnitude * (1 - SMOOTHING_DECAY);
        }

        const peakCandidates: FrequencyPeak[] = [];
        const nextBars = Array.from({ length: BAR_COUNT }, (_, barIndex) => {
          const startBin = Math.floor((barIndex / BAR_COUNT) * (maxBin + 1));
          const endBin = Math.max(
            startBin,
            Math.floor(((barIndex + 1) / BAR_COUNT) * (maxBin + 1)) - 1,
          );

          let highestMagnitude = 0;

          for (let binIndex = startBin; binIndex <= endBin; binIndex += 1) {
            const magnitude = persistence.smoothedBins[binIndex] ?? 0;

            if (magnitude > highestMagnitude) {
              highestMagnitude = magnitude;
            }

            if (
              binIndex > 0 &&
              binIndex < maxBin &&
              magnitude > (persistence.smoothedBins[binIndex - 1] ?? 0) &&
              magnitude >= (persistence.smoothedBins[binIndex + 1] ?? 0)
            ) {
              peakCandidates.push({
                frequencyHz: binIndex * binWidth,
                magnitude,
              });
            }
          }

          return highestMagnitude;
        });

        peakCandidates.sort((left, right) => right.magnitude - left.magnitude);
        setPeaks(peakCandidates.slice(0, PEAK_COUNT));
        setBars(nextBars);

        if (timestampMs - persistence.lastSampleTimeMs >= PERSISTENCE_SAMPLE_INTERVAL_MS) {
          const historyFrame = persistence.historyFrames[persistence.frameIndex];

          if (!historyFrame) {
            resources.animationFrameId = requestAnimationFrame(updateAnalysis);
            return;
          }

          for (let binIndex = 0; binIndex <= maxBin; binIndex += 1) {
            const sampleMagnitude = persistence.smoothedBins[binIndex] ?? 0;
            const previousFrameValue = historyFrame[binIndex] ?? 0;
            const previousSum = persistence.historySums[binIndex] ?? 0;
            persistence.historySums[binIndex] = previousSum + sampleMagnitude - previousFrameValue;
            historyFrame[binIndex] = sampleMagnitude;
          }

          persistence.frameIndex =
            (persistence.frameIndex + 1) % PERSISTENCE_WINDOW_SAMPLES;
          persistence.sampleCount = Math.min(
            persistence.sampleCount + 1,
            PERSISTENCE_WINDOW_SAMPLES,
          );
          persistence.lastSampleTimeMs = timestampMs;

          const warmupRatio = persistence.sampleCount / PERSISTENCE_WINDOW_SAMPLES;
          const activeSettings = settingsRef.current;
          const nextPersistentCandidates: PersistentCandidate[] = [];

          for (let binIndex = 1; binIndex <= maxBin; binIndex += 1) {
            const averageMagnitude =
              (persistence.historySums[binIndex] ?? 0) / persistence.sampleCount;

            let meanAbsoluteDeviation = 0;

            for (let sampleIndex = 0; sampleIndex < persistence.sampleCount; sampleIndex += 1) {
              meanAbsoluteDeviation += Math.abs(
                (persistence.historyFrames[sampleIndex]?.[binIndex] ?? 0) - averageMagnitude,
              );
            }

            meanAbsoluteDeviation /= persistence.sampleCount;

            const stability = clamp(
              1 - meanAbsoluteDeviation / Math.max(averageMagnitude, 1),
              0,
              1,
            );
            const strength = clamp(averageMagnitude / 140, 0, 1);
            const confidencePercent = Math.round(
              clamp((strength * 0.65 + stability * 0.35) * warmupRatio * 100, 0, 95),
            );
            const frequencyHz = binIndex * binWidth;
            const nearestMainsBandHz = findNearestMainsBandWithinTolerance(frequencyHz, 6);

            // These thresholds only gate which bins count as meaningful persistent
            // candidates. Lower values make the detector more permissive; higher
            // values require a tone to be stronger and more stable before selection.
            const passesThresholds =
              averageMagnitude >= activeSettings.minimumAverageStrength &&
              confidencePercent >= activeSettings.minimumPersistencePercent;

            if (!passesThresholds) {
              continue;
            }

            nextPersistentCandidates.push({
              frequencyHz,
              averageStrength: averageMagnitude,
              confidencePercent,
              nearestMainsBandHz,
              excludedByRumbleFilter: frequencyHz < activeSettings.rumbleCutoffHz,
            });
          }

          nextPersistentCandidates.sort((left, right) => {
            if (right.confidencePercent !== left.confidencePercent) {
              return right.confidencePercent - left.confidencePercent;
            }

            return right.averageStrength - left.averageStrength;
          });

          setPersistentCandidates(
            nextPersistentCandidates.slice(0, PERSISTENT_CANDIDATE_COUNT),
          );

          const mainCandidate =
            nextPersistentCandidates.find((candidate) => !candidate.excludedByRumbleFilter) ?? null;
          const candidateFrequencyHz = mainCandidate?.frequencyHz ?? null;
          const confidencePercent = mainCandidate?.confidencePercent ?? 0;
          const nearestMainsBandHz = mainCandidate?.nearestMainsBandHz ?? null;

          setHumCandidate({
            frequencyHz: candidateFrequencyHz,
            confidencePercent,
            status: classifyHumCandidate(confidencePercent),
            nearestMainsBandHz,
          });

          setMainsBands(
            MAINS_HUM_BANDS.map((frequencyHz) => {
              const centerBin = Math.round(frequencyHz / binWidth);
              const averageMagnitude =
                ((persistence.historySums[centerBin - 1] ?? 0) +
                  (persistence.historySums[centerBin] ?? 0) +
                  (persistence.historySums[centerBin + 1] ?? 0)) /
                (3 * persistence.sampleCount);
              const intensity = Math.round(clamp((averageMagnitude / 110) * 100, 0, 100));

              return {
                frequencyHz,
                intensity,
                highlighted:
                  intensity >= 28 ||
                  (nearestMainsBandHz !== null &&
                    Math.abs(nearestMainsBandHz - frequencyHz) <= 0.1 &&
                    confidencePercent >= activeSettings.minimumPersistencePercent),
              };
            }),
          );
        }

        resources.animationFrameId = requestAnimationFrame(updateAnalysis);
      };

      resources.animationFrameId = requestAnimationFrame(updateAnalysis);
      setIsListening(true);
      setStatusMessage('Microphone is active. Audio is being analyzed locally in memory.');
    } catch (error) {
      const message =
        error instanceof DOMException
          ? error.name === 'NotAllowedError'
            ? 'Microphone access was denied. Allow permission to analyze local audio.'
            : `Unable to access the microphone: ${error.message}`
          : 'Unable to access the microphone.';

      setErrorMessage(message);
      setStatusMessage('Microphone is inactive.');
      await stopListening();
    }
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Local low-frequency monitor</p>
            <h1>HumSniper</h1>
          </div>
          <span className={`status-badge ${isListening ? 'status-live' : 'status-idle'}`}>
            {isListening ? 'Mic Active' : 'Mic Off'}
          </span>
        </div>

        <p className="privacy-note">
          Audio is analyzed locally on your device and is not uploaded.
        </p>

        <p className="status-message">{statusMessage}</p>

        {errorMessage ? (
          <p className="error-message" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <div className="button-row">
          <button type="button" className="primary-button" onClick={() => void startListening()}>
            Start Listening
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void stopListening()}
            disabled={!isListening && !audioRef.current}
          >
            Stop Listening
          </button>
        </div>

        <section className="settings-panel">
          <div className="section-heading">
            <h2>Detection Settings</h2>
            <span>Updates live while listening</span>
          </div>

          <div className="preset-row">
            {Object.entries(DETECTION_PRESETS).map(([presetName, presetSettings]) => (
              <button
                key={presetName}
                type="button"
                className="preset-button"
                onClick={() => applyPreset(presetSettings)}
              >
                {presetName}
              </button>
            ))}
          </div>

          <div className="settings-grid">
            <label className="setting-control">
              <span>Rumble cutoff</span>
              <strong>{settings.rumbleCutoffHz} Hz</strong>
              <input
                type="range"
                min="10"
                max="40"
                step="1"
                value={settings.rumbleCutoffHz}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    rumbleCutoffHz: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="setting-control">
              <span>Minimum persistence</span>
              <strong>{settings.minimumPersistencePercent}%</strong>
              <input
                type="range"
                min="10"
                max="80"
                step="1"
                value={settings.minimumPersistencePercent}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    minimumPersistencePercent: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="setting-control">
              <span>Minimum average strength</span>
              <strong>{settings.minimumAverageStrength.toFixed(0)}</strong>
              <input
                type="range"
                min="8"
                max="60"
                step="1"
                value={settings.minimumAverageStrength}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    minimumAverageStrength: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>

          <p className="settings-note">
            Lower cutoff values allow more vibration and rumble to compete. Higher cutoff values
            focus the main hum candidate on more audible low-frequency tones.
          </p>
        </section>

        <section className="candidate-panel">
          <div className="section-heading">
            <h2>Hum Candidate</h2>
            <span>Rolling 3.8 second view</span>
          </div>

          <div className="candidate-grid">
            <div className="candidate-card">
              <span className="candidate-label">Strongest persistent frequency</span>
              <strong>
                {humCandidate.frequencyHz !== null
                  ? `${humCandidate.frequencyHz.toFixed(1)} Hz`
                  : 'No clear candidate'}
              </strong>
            </div>

            <div className="candidate-card">
              <span className="candidate-label">Approximate confidence</span>
              <strong>{humCandidate.confidencePercent}%</strong>
            </div>

            <div className="candidate-card">
              <span className="candidate-label">Status</span>
              <strong>{humCandidate.status}</strong>
            </div>
          </div>

          <p className="candidate-note">
            This panel shows a local hum candidate only. It is not a definitive diagnosis.
          </p>

          <div className="mains-band-row" aria-label="Common mains hum bands">
            {mainsBands.map((band) => (
              <span
                key={band.frequencyHz}
                className={`mains-chip ${band.highlighted ? 'mains-chip-active' : ''}`}
                title={`Persistent intensity ${band.intensity}%`}
              >
                {band.frequencyHz} Hz
                {humCandidate.nearestMainsBandHz === band.frequencyHz ? ' candidate' : ''}
              </span>
            ))}
          </div>
        </section>

        <section className="analysis-panel">
          <div className="section-heading">
            <h2>Debug Analysis</h2>
            <span>Why this candidate is being chosen</span>
          </div>

          <p className="analysis-note">
            Frequencies below {settings.rumbleCutoffHz} Hz can still appear here, but they will not
            become the main hum candidate.
          </p>

          {persistentCandidates.length > 0 ? (
            <ul className="analysis-list">
              {persistentCandidates.map((candidate) => (
                <li key={candidate.frequencyHz} className="analysis-item">
                  <div>
                    <strong>{candidate.frequencyHz.toFixed(1)} Hz</strong>
                    {candidate.nearestMainsBandHz !== null ? (
                      <span className="analysis-tag">
                        near {candidate.nearestMainsBandHz} Hz
                      </span>
                    ) : null}
                    {candidate.excludedByRumbleFilter ? (
                      <span className="analysis-tag analysis-tag-muted">
                        below cutoff
                      </span>
                    ) : null}
                  </div>
                  <span>avg strength {candidate.averageStrength.toFixed(1)}</span>
                  <span>persistence {candidate.confidencePercent}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Persistent candidates will appear here while listening.</p>
          )}
        </section>

        <section className="visualizer" aria-label="Low frequency visualization">
          {bars.map((magnitude, index) => (
            <div key={index} className="bar-slot">
              <div
                className="bar-fill"
                style={{ height: `${Math.max(6, (magnitude / 255) * 100)}%` }}
              />
            </div>
          ))}
        </section>

        <section className="peaks-panel">
          <div className="section-heading">
            <h2>Top 5 Peaks Under 300 Hz</h2>
            <span>Smoothed live FFT snapshot</span>
          </div>

          {peaks.length > 0 ? (
            <ul className="peak-list">
              {peaks.map((peak) => (
                <li key={`${peak.frequencyHz}-${peak.magnitude}`} className="peak-item">
                  <span>{peak.frequencyHz.toFixed(1)} Hz</span>
                  <span>{Math.round(peak.magnitude)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">No low-frequency peaks detected yet.</p>
          )}
        </section>
      </section>
    </main>
  );
}

export default App;
