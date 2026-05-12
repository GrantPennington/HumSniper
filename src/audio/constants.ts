import type { DetectionSettings, HumCandidate, MainsBandReading } from './types';

export const FFT_SIZE = 4096;
export const MAX_DISPLAY_FREQUENCY = 300;
export const PERSISTENT_CANDIDATE_COUNT = 5;
export const PEAK_COUNT = 5;
export const BAR_COUNT = 40;
export const SMOOTHING_DECAY = 0.82;
export const PERSISTENCE_SAMPLE_INTERVAL_MS = 120;
export const PERSISTENCE_WINDOW_SAMPLES = 32;
export const HARMONIC_TOLERANCE_HZ = 10;
export const CANDIDATE_HISTORY_LIMIT = 24;
export const MAINS_HUM_BANDS = [50, 60, 100, 120, 150, 180, 240] as const;
export const HARMONIC_FAMILIES = [
  { baseFrequencyHz: 50 as const, harmonicBandsHz: [50, 100, 150, 200, 250] },
  { baseFrequencyHz: 60 as const, harmonicBandsHz: [60, 120, 180, 240] },
];

export const DETECTION_PRESETS = {
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

export const EMPTY_HUM_CANDIDATE: HumCandidate = {
  frequencyHz: null,
  confidencePercent: 0,
  status: 'No stable hum',
  nearestMainsBandHz: null,
};

export function createEmptyBars() {
  return Array.from({ length: BAR_COUNT }, () => 0);
}

export function createEmptyMainsBandReadings(): MainsBandReading[] {
  return MAINS_HUM_BANDS.map((frequencyHz) => ({
    frequencyHz,
    intensity: 0,
    highlighted: false,
  }));
}
