import {
  CANDIDATE_HISTORY_LIMIT,
  EMPTY_HUM_CANDIDATE,
  HARMONIC_TOLERANCE_HZ,
  PERSISTENCE_WINDOW_SAMPLES,
} from './constants';
import { buildHumFamilies } from './harmonics';
import { clamp, classifyHumCandidate, findNearestMainsBandWithinTolerance } from './frequency';
import type {
  CandidateHistoryEntry,
  DetectionSettings,
  HumCandidate,
  HumFamily,
  PersistentCandidate,
  PersistenceState,
  StabilityState,
} from './types';

export function createPersistenceState(maxBin: number): PersistenceState {
  return {
    smoothedBins: Array.from({ length: maxBin + 1 }, () => 0),
    historyFrames: Array.from({ length: PERSISTENCE_WINDOW_SAMPLES }, () =>
      Array.from({ length: maxBin + 1 }, () => 0),
    ),
    historySums: Array.from({ length: maxBin + 1 }, () => 0),
    frameIndex: 0,
    sampleCount: 0,
    lastSampleTimeMs: 0,
  };
}

export function samplePersistenceFrame(persistence: PersistenceState, maxBin: number) {
  const historyFrame = persistence.historyFrames[persistence.frameIndex];

  if (!historyFrame) {
    return false;
  }

  for (let binIndex = 0; binIndex <= maxBin; binIndex += 1) {
    const sampleMagnitude = persistence.smoothedBins[binIndex] ?? 0;
    const previousFrameValue = historyFrame[binIndex] ?? 0;
    const previousSum = persistence.historySums[binIndex] ?? 0;
    persistence.historySums[binIndex] = previousSum + sampleMagnitude - previousFrameValue;
    historyFrame[binIndex] = sampleMagnitude;
  }

  persistence.frameIndex = (persistence.frameIndex + 1) % PERSISTENCE_WINDOW_SAMPLES;
  persistence.sampleCount = Math.min(persistence.sampleCount + 1, PERSISTENCE_WINDOW_SAMPLES);

  return true;
}

export function derivePersistentCandidates(params: {
  persistence: PersistenceState;
  maxBin: number;
  binWidth: number;
  settings: DetectionSettings;
}): PersistentCandidate[] {
  const { persistence, maxBin, binWidth, settings } = params;
  const warmupRatio = persistence.sampleCount / PERSISTENCE_WINDOW_SAMPLES;
  const candidates: PersistentCandidate[] = [];

  for (let binIndex = 1; binIndex <= maxBin; binIndex += 1) {
    const averageMagnitude = (persistence.historySums[binIndex] ?? 0) / persistence.sampleCount;

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
    const nearestMainsBandHz = findNearestMainsBandWithinTolerance(
      frequencyHz,
      HARMONIC_TOLERANCE_HZ,
    );

    // Lower thresholds make the detector more permissive; higher thresholds
    // require a band to remain stronger and steadier across the rolling window.
    const passesThresholds =
      averageMagnitude >= settings.minimumAverageStrength &&
      confidencePercent >= settings.minimumPersistencePercent;

    if (!passesThresholds) {
      continue;
    }

    candidates.push({
      frequencyHz,
      averageStrength: averageMagnitude,
      confidencePercent,
      nearestMainsBandHz,
      excludedByRumbleFilter: frequencyHz < settings.rumbleCutoffHz,
    });
  }

  candidates.sort((left, right) => {
    if (right.confidencePercent !== left.confidencePercent) {
      return right.confidencePercent - left.confidencePercent;
    }

    return right.averageStrength - left.averageStrength;
  });

  return candidates;
}

export function deriveMainHumCandidate(candidates: PersistentCandidate[]): HumCandidate {
  const mainCandidate =
    candidates.find((candidate) => !candidate.excludedByRumbleFilter) ?? null;

  if (!mainCandidate) {
    return EMPTY_HUM_CANDIDATE;
  }

  return {
    frequencyHz: mainCandidate.frequencyHz,
    confidencePercent: mainCandidate.confidencePercent,
    status: classifyHumCandidate(mainCandidate.confidencePercent),
    nearestMainsBandHz: mainCandidate.nearestMainsBandHz,
  };
}

export function deriveFamiliesFromCandidates(candidates: PersistentCandidate[]): HumFamily[] {
  return buildHumFamilies(candidates);
}

export function appendCandidateHistory(
  currentHistory: CandidateHistoryEntry[],
  params: {
    timestamp: number;
    humCandidate: HumCandidate;
    humFamilies: HumFamily[];
  },
) {
  const { timestamp, humCandidate, humFamilies } = params;
  const nextHistoryEntry: CandidateHistoryEntry = {
    timestamp,
    candidateFrequencyHz: humCandidate.frequencyHz,
    confidencePercent: humCandidate.confidencePercent,
    status: humCandidate.status,
    familyLabel: humFamilies[0]?.label ?? null,
  };

  return [...currentHistory, nextHistoryEntry].slice(-CANDIDATE_HISTORY_LIMIT);
}

export function deriveStabilityState(history: CandidateHistoryEntry[]): StabilityState {
  const recentHistory = history.slice(-12);

  if (recentHistory.length < 4) {
    return 'intermittent';
  }

  const activeEntries = recentHistory.filter((entry) => entry.candidateFrequencyHz !== null);

  if (activeEntries.length / recentHistory.length < 0.65) {
    return 'intermittent';
  }

  const frequencies = activeEntries
    .map((entry) => entry.candidateFrequencyHz)
    .filter((frequency): frequency is number => frequency !== null);
  const minFrequency = Math.min(...frequencies);
  const maxFrequency = Math.max(...frequencies);
  const spreadHz = maxFrequency - minFrequency;

  if (spreadHz <= 8) {
    return 'stable';
  }

  if (spreadHz <= 25) {
    return 'drifting';
  }

  return 'intermittent';
}
