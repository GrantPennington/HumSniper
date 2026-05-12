export type FrequencyPeak = {
  frequencyHz: number;
  magnitude: number;
};

export type HumStatus = 'No stable hum' | 'Possible hum' | 'Likely persistent hum';

export type HumCandidate = {
  frequencyHz: number | null;
  confidencePercent: number;
  status: HumStatus;
  nearestMainsBandHz: number | null;
};

export type PersistentCandidate = {
  frequencyHz: number;
  averageStrength: number;
  confidencePercent: number;
  nearestMainsBandHz: number | null;
  excludedByRumbleFilter: boolean;
};

export type HumFamily = {
  baseFrequencyHz: 50 | 60;
  label: string;
  matchedBandsHz: number[];
  combinedScore: number;
  explanation: string;
};

export type CandidateHistoryEntry = {
  timestamp: number;
  candidateFrequencyHz: number | null;
  confidencePercent: number;
  status: HumStatus;
  familyLabel: string | null;
};

export type StabilityState = 'stable' | 'drifting' | 'intermittent';

export type MainsBandReading = {
  frequencyHz: number;
  intensity: number;
  highlighted: boolean;
};

export type DetectionSettings = {
  rumbleCutoffHz: number;
  minimumPersistencePercent: number;
  minimumAverageStrength: number;
};

export type AppView = 'monitor' | 'analysis' | 'settings';

export type PersistenceState = {
  smoothedBins: number[];
  historyFrames: number[][];
  historySums: number[];
  frameIndex: number;
  sampleCount: number;
  lastSampleTimeMs: number;
};

export type AudioResources = {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  stream: MediaStream;
  animationFrameId: number | null;
};
