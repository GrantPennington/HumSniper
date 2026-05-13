import type {
  DetectionSettings,
  HumCandidate,
  HumFamily,
  InvestigationSnapshot,
  PersistentCandidate,
  SnapshotComparison,
  SnapshotFamilySummary,
} from './types';

const SNAPSHOT_CANDIDATE_LIMIT = 5;
const SNAPSHOT_FREQUENCY_MATCH_TOLERANCE_HZ = 3;
const SNAPSHOT_CONFIDENCE_DELTA_THRESHOLD = 8;

function cloneMainCandidate(candidate: HumCandidate): HumCandidate {
  return {
    frequencyHz: candidate.frequencyHz,
    confidencePercent: candidate.confidencePercent,
    status: candidate.status,
    nearestMainsBandHz: candidate.nearestMainsBandHz,
  };
}

function cloneFamilies(families: HumFamily[]): SnapshotFamilySummary[] {
  return families.map((family) => ({
    baseFrequencyHz: family.baseFrequencyHz,
    label: family.label,
    matchedBandsHz: [...family.matchedBandsHz],
    combinedScore: family.combinedScore,
  }));
}

export function captureInvestigationSnapshot(params: {
  label?: string;
  humCandidate: HumCandidate;
  persistentCandidates: PersistentCandidate[];
  families: HumFamily[];
  stabilityState: InvestigationSnapshot['stabilityState'];
  settings: DetectionSettings;
}): InvestigationSnapshot {
  const { label = '', humCandidate, persistentCandidates, families, stabilityState, settings } =
    params;

  return {
    id: `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    label,
    mainCandidate: cloneMainCandidate(humCandidate),
    persistentCandidates: persistentCandidates.slice(0, SNAPSHOT_CANDIDATE_LIMIT).map((candidate) => ({
      frequencyHz: candidate.frequencyHz,
      averageStrength: candidate.averageStrength,
      confidencePercent: candidate.confidencePercent,
      nearestMainsBandHz: candidate.nearestMainsBandHz,
      excludedByRumbleFilter: candidate.excludedByRumbleFilter,
    })),
    families: cloneFamilies(families),
    stabilityState,
    settings: { ...settings },
  };
}

function findMatchingCandidate(
  target: PersistentCandidate | InvestigationSnapshot['persistentCandidates'][number],
  candidates: InvestigationSnapshot['persistentCandidates'],
) {
  return (
    candidates.find(
      (candidate) =>
        Math.abs(candidate.frequencyHz - target.frequencyHz) <= SNAPSHOT_FREQUENCY_MATCH_TOLERANCE_HZ,
    ) ?? null
  );
}

function describeMainCandidateChange(
  beforeSnapshot: InvestigationSnapshot,
  afterSnapshot: InvestigationSnapshot,
) {
  const beforeFrequency = beforeSnapshot.mainCandidate.frequencyHz;
  const afterFrequency = afterSnapshot.mainCandidate.frequencyHz;

  if (beforeFrequency === null && afterFrequency === null) {
    return 'No clear main candidate in either snapshot.';
  }

  if (beforeFrequency === null && afterFrequency !== null) {
    return `A main candidate appeared near ${afterFrequency.toFixed(1)} Hz.`;
  }

  if (beforeFrequency !== null && afterFrequency === null) {
    return `The main candidate near ${beforeFrequency.toFixed(1)} Hz dropped out.`;
  }

  if (beforeFrequency !== null && afterFrequency !== null) {
    const frequencyDelta = Math.abs(beforeFrequency - afterFrequency);
    const confidenceDelta =
      afterSnapshot.mainCandidate.confidencePercent - beforeSnapshot.mainCandidate.confidencePercent;

    if (frequencyDelta <= SNAPSHOT_FREQUENCY_MATCH_TOLERANCE_HZ) {
      if (confidenceDelta >= SNAPSHOT_CONFIDENCE_DELTA_THRESHOLD) {
        return `The main candidate stayed near ${afterFrequency.toFixed(1)} Hz and looks stronger.`;
      }

      if (confidenceDelta <= -SNAPSHOT_CONFIDENCE_DELTA_THRESHOLD) {
        return `The main candidate stayed near ${afterFrequency.toFixed(1)} Hz and looks weaker.`;
      }

      return `The main candidate stayed near ${afterFrequency.toFixed(1)} Hz with only a small confidence shift.`;
    }

    return `The main candidate possibly changed from ${beforeFrequency.toFixed(1)} Hz to ${afterFrequency.toFixed(1)} Hz.`;
  }

  return 'The main candidate possibly changed.';
}

function describeFamilyChange(
  beforeSnapshot: InvestigationSnapshot,
  afterSnapshot: InvestigationSnapshot,
) {
  const beforeLabels = beforeSnapshot.families.map((family) => family.label);
  const afterLabels = afterSnapshot.families.map((family) => family.label);

  if (beforeLabels.length === 0 && afterLabels.length === 0) {
    return 'No active hum family in either snapshot.';
  }

  if (beforeLabels.length === 0 && afterLabels.length > 0) {
    return `${afterLabels.join(', ')} appeared as a possible family pattern.`;
  }

  if (beforeLabels.length > 0 && afterLabels.length === 0) {
    return `${beforeLabels.join(', ')} dropped out as a visible family pattern.`;
  }

  if (beforeLabels.join('|') === afterLabels.join('|')) {
    return `${afterLabels.join(', ')} remained visible, though matched bands may have shifted.`;
  }

  return `Family pattern possibly changed from ${beforeLabels.join(', ')} to ${afterLabels.join(', ')}.`;
}

export function compareInvestigationSnapshots(
  beforeSnapshot: InvestigationSnapshot,
  afterSnapshot: InvestigationSnapshot,
): SnapshotComparison {
  const appearedFrequenciesHz = afterSnapshot.persistentCandidates
    .filter((candidate) => findMatchingCandidate(candidate, beforeSnapshot.persistentCandidates) === null)
    .map((candidate) => candidate.frequencyHz);

  const disappearedFrequenciesHz = beforeSnapshot.persistentCandidates
    .filter((candidate) => findMatchingCandidate(candidate, afterSnapshot.persistentCandidates) === null)
    .map((candidate) => candidate.frequencyHz);

  const confidenceChanges = beforeSnapshot.persistentCandidates
    .map((beforeCandidate) => {
      const afterCandidate = findMatchingCandidate(beforeCandidate, afterSnapshot.persistentCandidates);

      if (!afterCandidate) {
        return null;
      }

      const confidenceDelta =
        afterCandidate.confidencePercent - beforeCandidate.confidencePercent;

      if (Math.abs(confidenceDelta) < 4) {
        return {
          frequencyHz: afterCandidate.frequencyHz,
          direction: 'possibly changed' as const,
          beforeConfidencePercent: beforeCandidate.confidencePercent,
          afterConfidencePercent: afterCandidate.confidencePercent,
        };
      }

      return {
        frequencyHz: afterCandidate.frequencyHz,
        direction: confidenceDelta > 0 ? ('stronger' as const) : ('weaker' as const),
        beforeConfidencePercent: beforeCandidate.confidencePercent,
        afterConfidencePercent: afterCandidate.confidencePercent,
      };
    })
    .filter((change) => change !== null);

  return {
    appearedFrequenciesHz,
    disappearedFrequenciesHz,
    confidenceChanges,
    familyChangeSummary: describeFamilyChange(beforeSnapshot, afterSnapshot),
    mainCandidateChangeSummary: describeMainCandidateChange(beforeSnapshot, afterSnapshot),
  };
}
