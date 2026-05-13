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
import { captureInvestigationSnapshot } from './audio/snapshots';
import AnalysisView from './components/AnalysisView';
import InvestigationView from './components/InvestigationView';
import MonitorView from './components/MonitorView';
import SettingsView from './components/SettingsView';
import type {
  AppView,
  AudioResources,
  CandidateHistoryEntry,
  DetectionSettings,
  FrequencyPeak,
  HumCandidate,
  HumFamily,
  InvestigationSnapshot,
  MainsBandReading,
  PersistentCandidate,
  PersistenceState,
} from './audio/types';

const VIEW_TITLES: Record<AppView, { label: string; description: string }> = {
  monitor: {
    label: 'Monitor',
    description: 'Live candidate, spectrum, and stability.',
  },
  analysis: {
    label: 'Analysis',
    description: 'Persistent candidate ranking.',
  },
  settings: {
    label: 'Settings',
    description: 'Live thresholds and presets.',
  },
  investigation: {
    label: 'Investigation',
    description: 'Compare derived room-state snapshots.',
  },
};

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
  const [snapshots, setSnapshots] = useState<InvestigationSnapshot[]>([]);
  const [selectedSnapshotAId, setSelectedSnapshotAId] = useState('');
  const [selectedSnapshotBId, setSelectedSnapshotBId] = useState('');
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
  const activeViewMeta = VIEW_TITLES[activeView];

  const captureSnapshot = () => {
    const nextSnapshot = captureInvestigationSnapshot({
      humCandidate,
      persistentCandidates,
      families: humFamilies,
      stabilityState,
      settings,
    });

    setSnapshots((current) => {
      const nextSnapshots = [nextSnapshot, ...current];

      if (selectedSnapshotAId === '') {
        setSelectedSnapshotAId(nextSnapshot.id);
      } else if (selectedSnapshotBId === '' && selectedSnapshotAId !== nextSnapshot.id) {
        setSelectedSnapshotBId(nextSnapshot.id);
      }

      return nextSnapshots;
    });
  };

  const updateSnapshotLabel = (snapshotId: string, label: string) => {
    setSnapshots((current) =>
      current.map((snapshot) => (snapshot.id === snapshotId ? { ...snapshot, label } : snapshot)),
    );
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
      <section className="desktop-frame">
        <header className="topbar">
          <div className="topbar-row topbar-row-main">
            <div className="topbar-brand">
              <span className="app-title">HumSniper</span>
              <span className="toolbar-separator" aria-hidden="true" />
              <span className="toolbar-subtitle">Local hum investigation</span>
            </div>

            <div className="topbar-summary">
              <div className="topbar-summary-card">
                <span className="summary-label">View</span>
                <strong>{activeViewMeta.label}</strong>
                <span className="toolbar-value-muted">{activeViewMeta.description}</span>
              </div>

              <div className="topbar-summary-card">
                <span className="summary-label">Capture</span>
                <strong>{isListening ? 'Mic active' : 'Mic inactive'}</strong>
                <span className="toolbar-value-muted">
                  {isListening ? 'Local in-memory analysis.' : 'Ready to start.'}
                </span>
              </div>

              <span className={`status-badge ${isListening ? 'status-live' : 'status-idle'}`}>
                {isListening ? 'Mic Active' : 'Mic Off'}
              </span>
            </div>
          </div>

          <div className="topbar-row topbar-row-controls">
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
              <button
                type="button"
                className={`view-tab ${activeView === 'investigation' ? 'view-tab-active' : ''}`}
                onClick={() => setActiveView('investigation')}
              >
                Investigation
              </button>
            </nav>

            <div className="button-row topbar-actions">
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
                disabled={!isListening && audioRef.current === null}
              >
                Stop Listening
              </button>
            </div>
          </div>

          <div className="topbar-meta">
            <p className="privacy-note">
              Local-only analysis. No uploads, telemetry, or raw audio storage.
            </p>

            <p className="status-message">{statusMessage}</p>
          </div>

          {errorMessage ? (
            <p className="error-message" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </header>

        <section className="panel">
          {activeView === 'monitor' ? (
            <MonitorView
              humCandidate={humCandidate}
              mainsBands={mainsBands}
              humFamilies={humFamilies}
              stabilityState={stabilityState}
              candidateHistory={candidateHistory}
              latestHistoryEntry={latestHistoryEntry}
              bars={bars}
              peaks={peaks}
            />
          ) : null}

          {activeView === 'analysis' ? (
            <AnalysisView
              rumbleCutoffHz={settings.rumbleCutoffHz}
              persistentCandidates={persistentCandidates}
            />
          ) : null}

          {activeView === 'settings' ? (
            <SettingsView
              settings={settings}
              onApplyPreset={applyPreset}
              onRumbleCutoffChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  rumbleCutoffHz: value,
                }))
              }
              onMinimumPersistenceChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  minimumPersistencePercent: value,
                }))
              }
              onMinimumAverageStrengthChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  minimumAverageStrength: value,
                }))
              }
            />
          ) : null}

          {activeView === 'investigation' ? (
            <InvestigationView
              isListening={isListening}
              snapshots={snapshots}
              selectedSnapshotAId={selectedSnapshotAId}
              selectedSnapshotBId={selectedSnapshotBId}
              onCaptureSnapshot={captureSnapshot}
              onLabelChange={updateSnapshotLabel}
              onSelectSnapshotA={setSelectedSnapshotAId}
              onSelectSnapshotB={setSelectedSnapshotBId}
            />
          ) : null}
        </section>
      </section>
    </main>
  );
}

export default App;
