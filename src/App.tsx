import { useEffect, useRef, useState } from 'react';
import {
  DETECTION_PRESETS,
  EMPTY_HUM_CANDIDATE,
  FFT_SIZE,
  MAX_DISPLAY_FREQUENCY,
  PERSISTENCE_SAMPLE_INTERVAL_MS,
  PERSISTENT_CANDIDATE_COUNT,
  createEmptyBars,
  createEmptyMainsBandReadings,
} from './audio/constants';
import {
  buildMainsBandReadings,
  buildPeaksAndBars,
  smoothFrequencyBins,
} from './audio/frequency';
import {
  appendCandidateHistory,
  createPersistenceState,
  deriveFamiliesFromCandidates,
  deriveMainHumCandidate,
  derivePersistentCandidates,
  deriveStabilityState,
  samplePersistenceFrame,
} from './audio/persistence';
import type {
  AppView,
  AudioResources,
  CandidateHistoryEntry,
  DetectionSettings,
  FrequencyPeak,
  HumCandidate,
  HumFamily,
  MainsBandReading,
  PersistentCandidate,
  PersistenceState,
} from './audio/types';

function App() {
  const [activeView, setActiveView] = useState<AppView>('monitor');
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Microphone is inactive. Start listening to begin local analysis.',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<FrequencyPeak[]>([]);
  const [bars, setBars] = useState<number[]>(() => createEmptyBars());
  const [humCandidate, setHumCandidate] = useState<HumCandidate>(EMPTY_HUM_CANDIDATE);
  const [persistentCandidates, setPersistentCandidates] = useState<PersistentCandidate[]>([]);
  const [humFamilies, setHumFamilies] = useState<HumFamily[]>([]);
  const [candidateHistory, setCandidateHistory] = useState<CandidateHistoryEntry[]>([]);
  const [settings, setSettings] = useState<DetectionSettings>(DETECTION_PRESETS.Balanced);
  const [mainsBands, setMainsBands] = useState<MainsBandReading[]>(createEmptyMainsBandReadings);
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
    setBars(createEmptyBars());
    setHumCandidate(EMPTY_HUM_CANDIDATE);
    setPersistentCandidates([]);
    setHumFamilies([]);
    setCandidateHistory([]);
    setMainsBands(createEmptyMainsBandReadings());
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

  const stabilityState = deriveStabilityState(candidateHistory);
  const latestHistoryEntry = candidateHistory.at(-1) ?? null;

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

      persistenceRef.current = createPersistenceState(maxBin);

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

        smoothFrequencyBins(persistence, frequencyData, maxBin);

        const spectrum = buildPeaksAndBars(persistence.smoothedBins, binWidth, maxBin);
        setPeaks(spectrum.peaks);
        setBars(spectrum.bars);

        if (timestampMs - persistence.lastSampleTimeMs >= PERSISTENCE_SAMPLE_INTERVAL_MS) {
          if (!samplePersistenceFrame(persistence, maxBin)) {
            resources.animationFrameId = requestAnimationFrame(updateAnalysis);
            return;
          }

          persistence.lastSampleTimeMs = timestampMs;

          const activeSettings = settingsRef.current;
          const nextPersistentCandidates = derivePersistentCandidates({
            persistence,
            maxBin,
            binWidth,
            settings: activeSettings,
          });
          const nextHumFamilies = deriveFamiliesFromCandidates(nextPersistentCandidates);

          setPersistentCandidates(
            nextPersistentCandidates.slice(0, PERSISTENT_CANDIDATE_COUNT),
          );
          setHumFamilies(nextHumFamilies);

          const nextHumCandidate = deriveMainHumCandidate(nextPersistentCandidates);
          setHumCandidate(nextHumCandidate);

          setCandidateHistory((currentHistory) =>
            appendCandidateHistory(currentHistory, {
              timestamp: Date.now(),
              humCandidate: nextHumCandidate,
              humFamilies: nextHumFamilies,
            }),
          );

          setMainsBands(
            buildMainsBandReadings({
              persistence,
              binWidth,
              nearestMainsBandHz: nextHumCandidate.nearestMainsBandHz,
              confidencePercent: nextHumCandidate.confidencePercent,
              minimumPersistencePercent: activeSettings.minimumPersistencePercent,
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
            <p className="panel-intro">
              A local listening instrument for tracking persistent low-frequency hum.
            </p>
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

        <nav className="view-tabs" aria-label="HumSniper sections">
          <button
            type="button"
            className={`view-tab ${activeView === 'monitor' ? 'view-tab-active' : ''}`}
            onClick={() => setActiveView('monitor')}
          >
            Monitor
          </button>
          <button
            type="button"
            className={`view-tab ${activeView === 'analysis' ? 'view-tab-active' : ''}`}
            onClick={() => setActiveView('analysis')}
          >
            Analysis
          </button>
          <button
            type="button"
            className={`view-tab ${activeView === 'settings' ? 'view-tab-active' : ''}`}
            onClick={() => setActiveView('settings')}
          >
            Settings
          </button>
        </nav>

        {activeView === 'monitor' ? (
          <div className="view-stack">
            <section className="monitor-hero">
              <div className="monitor-copy">
                <h2>Live Monitor</h2>
                <p className="monitor-note">
                  Start listening to watch the strongest persistent low-frequency candidate update
                  in real time.
                </p>
              </div>

              <div className="button-row">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void startListening()}
                  disabled={isListening}
                >
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
            </section>

            <section className="candidate-panel">
              <div className="section-heading">
                <h2>Hum Candidate</h2>
                <span>Rolling 3.8 second view</span>
              </div>

              <div className="candidate-grid">
                <div className="candidate-card candidate-card-primary">
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
                This is a local candidate only. It helps you investigate recurring hum, not
                diagnose it with certainty.
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

            <section className="family-panel">
              <div className="section-heading">
                <h2>Hum Families</h2>
                <span>Grouped harmonic patterns under 300 Hz</span>
              </div>

              <p className="family-note">
                Matched bands are possible family hints only. A recurring source can create energy
                at multiples of a base frequency, which is why 50 Hz or 60 Hz patterns often show
                up in related bands.
              </p>

              {humFamilies.length > 0 ? (
                <ul className="family-list">
                  {humFamilies.map((family) => (
                    <li key={family.baseFrequencyHz} className="family-item">
                      <div>
                        <strong>{family.label}</strong>
                        <p className="family-explanation">{family.explanation}</p>
                      </div>
                      <span>matched bands {family.matchedBandsHz.join(', ')} Hz</span>
                      <span>combined score {family.combinedScore}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">
                  No clear 50 Hz or 60 Hz family matches are visible right now.
                </p>
              )}
            </section>

            <section className="history-panel">
              <div className="section-heading">
                <h2>Stability</h2>
                <span>Recent candidate history</span>
              </div>

              <div className="history-summary">
                <strong>{stabilityState}</strong>
                <span>
                  A persistent hum should appear as a steady pattern over time rather than jumping
                  around or disappearing between updates.
                </span>
              </div>

              {candidateHistory.length > 0 ? (
                <>
                  <div className="history-strip" aria-label="Recent hum candidate history">
                    {candidateHistory.map((entry) => (
                      <div
                        key={entry.timestamp}
                        className={`history-tick ${
                          entry.candidateFrequencyHz === null
                            ? 'history-tick-empty'
                            : entry.familyLabel !== null
                              ? 'history-tick-family'
                              : ''
                        }`}
                        style={{
                          height: `${Math.max(22, (entry.confidencePercent / 100) * 72)}px`,
                        }}
                        title={
                          entry.candidateFrequencyHz !== null
                            ? `${entry.candidateFrequencyHz.toFixed(1)} Hz, ${entry.confidencePercent}%`
                            : 'No clear candidate'
                        }
                      />
                    ))}
                  </div>

                  <div className="history-caption-row">
                    <span>Older</span>
                    <span>
                      Latest:{' '}
                      {latestHistoryEntry !== null && latestHistoryEntry.candidateFrequencyHz !== null
                        ? `${latestHistoryEntry.candidateFrequencyHz.toFixed(1)} Hz`
                        : 'No clear candidate'}
                    </span>
                  </div>

                  <p className="history-note">
                    Blue ticks mark candidate updates. Brighter ticks indicate a possible harmonic
                    family was active for that reading.
                  </p>
                </>
              ) : (
                <p className="empty-state">History will begin once a few candidate updates arrive.</p>
              )}
            </section>

            <section className="visualizer-panel">
              <div className="section-heading">
                <h2>Live Spectrum</h2>
                <span>Smoothed low-frequency view under 300 Hz</span>
              </div>

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
          </div>
        ) : null}

        {activeView === 'analysis' ? (
          <div className="view-stack">
            <section className="analysis-panel">
              <div className="section-heading">
                <h2>Debug Analysis</h2>
                <span>Why this candidate is being chosen</span>
              </div>

              <p className="analysis-note">
                Frequencies below {settings.rumbleCutoffHz} Hz can still appear here, but they
                will not become the main hum candidate.
              </p>

              <p className="analysis-note">
                Use this view when the monitor looks surprising or when you want to compare several
                persistent bands side by side.
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
                          <span className="analysis-tag analysis-tag-muted">below cutoff</span>
                        ) : null}
                      </div>
                      <span>avg strength {candidate.averageStrength.toFixed(1)}</span>
                      <span>persistence {candidate.confidencePercent}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">
                  Persistent candidates will appear here while listening.
                </p>
              )}
            </section>
          </div>
        ) : null}

        {activeView === 'settings' ? (
          <div className="view-stack">
            <section className="settings-panel">
              <div className="section-heading">
                <h2>Detection Settings</h2>
                <span>Updates live while listening</span>
              </div>

              <p className="settings-note">
                Use presets for quick tuning, then adjust sliders if your room is unusually noisy
                or vibration-heavy.
              </p>

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
                Lower cutoff values allow more vibration and rumble to compete. Higher cutoff
                values focus the main hum candidate on more audible low-frequency tones.
              </p>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default App;
