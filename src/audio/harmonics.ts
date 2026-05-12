import { HARMONIC_FAMILIES, HARMONIC_TOLERANCE_HZ } from './constants';
import { clamp } from './frequency';
import type { HumFamily, PersistentCandidate } from './types';

export function buildHumFamilies(candidates: PersistentCandidate[]): HumFamily[] {
  // A single source can create energy at multiples of a base frequency. Those
  // multiples are harmonics, so grouping them helps reveal meaningful hum
  // patterns instead of treating every nearby band as unrelated.
  return HARMONIC_FAMILIES.map((family) => {
    const matches = family.harmonicBandsHz
      .map((bandHz) => {
        const matchedCandidate = candidates.find(
          (candidate) => Math.abs(candidate.frequencyHz - bandHz) <= HARMONIC_TOLERANCE_HZ,
        );

        return matchedCandidate
          ? {
              targetBandHz: bandHz,
              candidate: matchedCandidate,
            }
          : null;
      })
      .filter((match): match is NonNullable<typeof match> => match !== null);

    if (matches.length === 0) {
      return null;
    }

    const averageConfidence =
      matches.reduce((sum, match) => sum + match.candidate.confidencePercent, 0) / matches.length;
    const averageStrength =
      matches.reduce((sum, match) => sum + match.candidate.averageStrength, 0) / matches.length;
    const harmonicCoverage = matches.length / family.harmonicBandsHz.length;
    const combinedScore = Math.round(
      clamp(averageConfidence * 0.6 + averageStrength * 0.35 + harmonicCoverage * 100 * 0.25, 0, 99),
    );

    return {
      baseFrequencyHz: family.baseFrequencyHz,
      label: `Possible ${family.baseFrequencyHz} Hz family`,
      matchedBandsHz: matches.map((match) => match.targetBandHz),
      combinedScore,
      explanation: `${matches.length} matched band${matches.length === 1 ? '' : 's'} suggest a candidate family around ${family.baseFrequencyHz} Hz.`,
    };
  })
    .filter((family): family is HumFamily => family !== null)
    .sort((left, right) => right.combinedScore - left.combinedScore);
}
