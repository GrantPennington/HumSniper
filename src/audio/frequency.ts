import { BAR_COUNT, MAINS_HUM_BANDS, PEAK_COUNT, SMOOTHING_DECAY } from './constants';
import type {
  FrequencyPeak,
  HumStatus,
  MainsBandReading,
  PersistenceState,
} from './types';

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function findNearestMainsBandWithinTolerance(
  frequencyHz: number,
  toleranceHz: number,
) {
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

export function classifyHumCandidate(confidencePercent: number): HumStatus {
  if (confidencePercent >= 68) {
    return 'Likely persistent hum';
  }

  if (confidencePercent >= 38) {
    return 'Possible hum';
  }

  return 'No stable hum';
}

export function smoothFrequencyBins(
  persistence: PersistenceState,
  frequencyData: Uint8Array,
  maxBin: number,
) {
  for (let binIndex = 0; binIndex <= maxBin; binIndex += 1) {
    const rawMagnitude = frequencyData[binIndex] ?? 0;
    const previousMagnitude = persistence.smoothedBins[binIndex] ?? 0;
    persistence.smoothedBins[binIndex] =
      previousMagnitude * SMOOTHING_DECAY + rawMagnitude * (1 - SMOOTHING_DECAY);
  }
}

export function buildPeaksAndBars(
  smoothedBins: number[],
  binWidth: number,
  maxBin: number,
): { bars: number[]; peaks: FrequencyPeak[] } {
  const peakCandidates: FrequencyPeak[] = [];
  const bars = Array.from({ length: BAR_COUNT }, (_, barIndex) => {
    const startBin = Math.floor((barIndex / BAR_COUNT) * (maxBin + 1));
    const endBin = Math.max(
      startBin,
      Math.floor(((barIndex + 1) / BAR_COUNT) * (maxBin + 1)) - 1,
    );

    let highestMagnitude = 0;

    for (let binIndex = startBin; binIndex <= endBin; binIndex += 1) {
      const magnitude = smoothedBins[binIndex] ?? 0;

      if (magnitude > highestMagnitude) {
        highestMagnitude = magnitude;
      }

      if (
        binIndex > 0 &&
        binIndex < maxBin &&
        magnitude > (smoothedBins[binIndex - 1] ?? 0) &&
        magnitude >= (smoothedBins[binIndex + 1] ?? 0)
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

  return {
    bars,
    peaks: peakCandidates.slice(0, PEAK_COUNT),
  };
}

export function buildMainsBandReadings(params: {
  persistence: PersistenceState;
  binWidth: number;
  nearestMainsBandHz: number | null;
  confidencePercent: number;
  minimumPersistencePercent: number;
}): MainsBandReading[] {
  const {
    persistence,
    binWidth,
    nearestMainsBandHz,
    confidencePercent,
    minimumPersistencePercent,
  } = params;

  return MAINS_HUM_BANDS.map((frequencyHz) => {
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
          confidencePercent >= minimumPersistencePercent),
    };
  });
}
