import { useEffect, useRef, useState } from 'react';

type FrequencyPeak = {
  frequencyHz: number;
  magnitude: number;
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
const BAR_COUNT = 40;

function App() {
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Microphone is inactive. Start listening to begin local analysis.',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [peaks, setPeaks] = useState<FrequencyPeak[]>([]);
  const [bars, setBars] = useState<number[]>(() => Array.from({ length: BAR_COUNT }, () => 0));
  const audioRef = useRef<AudioResources | null>(null);

  useEffect(() => {
    return () => {
      void stopListening();
    };
  }, []);

  const stopListening = async () => {
    const audio = audioRef.current;

    if (!audio) {
      setIsListening(false);
      setStatusMessage('Microphone is inactive. Start listening to begin local analysis.');
      return;
    }

    if (audio.animationFrameId !== null) {
      cancelAnimationFrame(audio.animationFrameId);
    }

    audio.stream.getTracks().forEach((track) => track.stop());
    audioRef.current = null;
    setIsListening(false);
    setPeaks([]);
    setBars(Array.from({ length: BAR_COUNT }, () => 0));
    setStatusMessage('Microphone is inactive. Audio capture has been fully released.');

    await audio.audioContext.close();
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
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      const resources: AudioResources = {
        audioContext,
        analyser,
        stream,
        animationFrameId: null,
      };
      audioRef.current = resources;

      const updateAnalysis = () => {
        if (!audioRef.current) {
          return;
        }

        analyser.getByteFrequencyData(frequencyData);

        const sampleRate = audioContext.sampleRate;
        const binWidth = sampleRate / analyser.fftSize;
        const maxBin = Math.min(
          frequencyData.length - 1,
          Math.floor(MAX_DISPLAY_FREQUENCY / binWidth),
        );

        const peakCandidates: FrequencyPeak[] = [];
        const nextBars = Array.from({ length: BAR_COUNT }, (_, barIndex) => {
          const startBin = Math.floor((barIndex / BAR_COUNT) * (maxBin + 1));
          const endBin = Math.max(
            startBin,
            Math.floor(((barIndex + 1) / BAR_COUNT) * (maxBin + 1)) - 1,
          );

          let highestMagnitude = 0;

          // Scan the low-frequency FFT bins once and reuse those values for both the
          // peak list and the coarse bar chart so the UI stays in sync.
          for (let binIndex = startBin; binIndex <= endBin; binIndex += 1) {
            const magnitude = frequencyData[binIndex] ?? 0;

            if (magnitude > highestMagnitude) {
              highestMagnitude = magnitude;
            }

            if (
              binIndex > 0 &&
              binIndex < maxBin &&
              magnitude > (frequencyData[binIndex - 1] ?? 0) &&
              magnitude >= (frequencyData[binIndex + 1] ?? 0)
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

        <section className="visualizer" aria-label="Low frequency visualization">
          {bars.map((magnitude, index) => (
            <div key={index} className="bar-slot">
              <div className="bar-fill" style={{ height: `${Math.max(6, (magnitude / 255) * 100)}%` }} />
            </div>
          ))}
        </section>

        <section className="peaks-panel">
          <div className="section-heading">
            <h2>Top 5 Peaks Under 300 Hz</h2>
            <span>Live FFT snapshot</span>
          </div>

          {peaks.length > 0 ? (
            <ul className="peak-list">
              {peaks.map((peak) => (
                <li key={`${peak.frequencyHz}-${peak.magnitude}`} className="peak-item">
                  <span>{peak.frequencyHz.toFixed(1)} Hz</span>
                  <span>{peak.magnitude}</span>
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
