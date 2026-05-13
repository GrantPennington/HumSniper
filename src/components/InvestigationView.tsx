import { compareInvestigationSnapshots } from '../audio/snapshots';
import type { InvestigationSnapshot } from '../audio/types';

type InvestigationViewProps = {
  isListening: boolean;
  snapshots: InvestigationSnapshot[];
  selectedSnapshotAId: string;
  selectedSnapshotBId: string;
  onCaptureSnapshot: () => void;
  onLabelChange: (snapshotId: string, label: string) => void;
  onSelectSnapshotA: (snapshotId: string) => void;
  onSelectSnapshotB: (snapshotId: string) => void;
};

function formatSnapshotTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatMainCandidate(snapshot: InvestigationSnapshot) {
  if (snapshot.mainCandidate.frequencyHz === null) {
    return 'No clear candidate';
  }

  return `${snapshot.mainCandidate.frequencyHz.toFixed(1)} Hz, ${snapshot.mainCandidate.confidencePercent}%`;
}

function formatPrimaryFamily(snapshot: InvestigationSnapshot) {
  const family = snapshot.families[0] ?? null;

  if (!family) {
    return 'No active family';
  }

  return `${family.label} (${family.matchedBandsHz.join(', ')} Hz)`;
}

function InvestigationView({
  isListening,
  snapshots,
  selectedSnapshotAId,
  selectedSnapshotBId,
  onCaptureSnapshot,
  onLabelChange,
  onSelectSnapshotA,
  onSelectSnapshotB,
}: InvestigationViewProps) {
  const selectedSnapshotA =
    snapshots.find((snapshot) => snapshot.id === selectedSnapshotAId) ?? null;
  const selectedSnapshotB =
    snapshots.find((snapshot) => snapshot.id === selectedSnapshotBId) ?? null;
  const comparison =
    selectedSnapshotA !== null && selectedSnapshotB !== null
      ? compareInvestigationSnapshots(selectedSnapshotA, selectedSnapshotB)
      : null;

  return (
    <div className="view-stack">
      <section className="investigation-panel">
        <div className="section-heading">
          <h2>Investigation Snapshots</h2>
          <span>Capture and compare room states</span>
        </div>

        <p className="investigation-note">
          Capture the current derived analysis state for moments like baseline, AC on, or laptop
          fan load.
        </p>

        <div className="investigation-toolbar">
          <button type="button" className="primary-button" onClick={onCaptureSnapshot}>
            Capture Snapshot
          </button>
          <span className={`capture-status ${isListening ? 'capture-status-live' : ''}`}>
            {isListening ? 'Ready while listening' : 'Can also capture the current idle state'}
          </span>
        </div>

        <p className="privacy-note privacy-note-compact">
          Snapshots store derived frequency analysis only. They do not store raw audio.
        </p>
      </section>

      <section className="investigation-panel">
        <div className="section-heading">
          <h2>Captured States</h2>
          <span>{snapshots.length} in-memory snapshots</span>
        </div>

        {snapshots.length > 0 ? (
          <ul className="snapshot-list">
            {snapshots.map((snapshot, index) => (
              <li key={snapshot.id} className="snapshot-item">
                <div className="snapshot-item-header">
                  <input
                    type="text"
                    className="snapshot-label-input"
                    value={snapshot.label}
                    onChange={(event) => onLabelChange(snapshot.id, event.target.value)}
                    placeholder={`Snapshot ${index + 1} label`}
                    maxLength={40}
                    aria-label={`Label for snapshot ${index + 1}`}
                  />
                  <span className="snapshot-time">{formatSnapshotTimestamp(snapshot.timestamp)}</span>
                </div>

                <div className="snapshot-summary-grid">
                  <div className="snapshot-summary-card">
                    <span className="candidate-label">Main candidate</span>
                    <strong>{formatMainCandidate(snapshot)}</strong>
                    <span>{snapshot.mainCandidate.status}</span>
                  </div>

                  <div className="snapshot-summary-card">
                    <span className="candidate-label">Active family</span>
                    <strong>{formatPrimaryFamily(snapshot)}</strong>
                  </div>

                  <div className="snapshot-summary-card">
                    <span className="candidate-label">Stability summary</span>
                    <strong>{snapshot.stabilityState}</strong>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            No snapshots yet. Start listening, change the room state, then capture derived views to
            compare later in this session.
          </p>
        )}
      </section>

      <section className="investigation-panel">
        <div className="section-heading">
          <h2>Compare Snapshots</h2>
          <span>Approximate changes only</span>
        </div>

        <p className="investigation-note">
          Comparison is intentionally lightweight. It compares stored derived candidates and family
          summaries, not raw audio and not raw FFT frames.
        </p>

        <div className="comparison-picker-grid">
          <label className="setting-control">
            <span>Snapshot A</span>
            <select value={selectedSnapshotAId} onChange={(event) => onSelectSnapshotA(event.target.value)}>
              <option value="">Select snapshot</option>
              {snapshots.map((snapshot, index) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {(snapshot.label || `Snapshot ${index + 1}`).trim()} • {formatSnapshotTimestamp(snapshot.timestamp)}
                </option>
              ))}
            </select>
          </label>

          <label className="setting-control">
            <span>Snapshot B</span>
            <select value={selectedSnapshotBId} onChange={(event) => onSelectSnapshotB(event.target.value)}>
              <option value="">Select snapshot</option>
              {snapshots.map((snapshot, index) => (
                <option key={snapshot.id} value={snapshot.id}>
                  {(snapshot.label || `Snapshot ${index + 1}`).trim()} • {formatSnapshotTimestamp(snapshot.timestamp)}
                </option>
              ))}
            </select>
          </label>
        </div>

        {comparison !== null ? (
          <div className="comparison-grid">
            <div className="comparison-card">
              <span className="candidate-label">Main candidate</span>
              <strong>{comparison.mainCandidateChangeSummary}</strong>
            </div>

            <div className="comparison-card">
              <span className="candidate-label">Family changes</span>
              <strong>{comparison.familyChangeSummary}</strong>
            </div>

            <div className="comparison-card">
              <span className="candidate-label">Appeared</span>
              <strong>
                {comparison.appearedFrequenciesHz.length > 0
                  ? comparison.appearedFrequenciesHz.map((frequencyHz) => `${frequencyHz.toFixed(1)} Hz`).join(', ')
                  : 'No new persistent frequencies'}
              </strong>
            </div>

            <div className="comparison-card">
              <span className="candidate-label">Dropped</span>
              <strong>
                {comparison.disappearedFrequenciesHz.length > 0
                  ? comparison.disappearedFrequenciesHz.map((frequencyHz) => `${frequencyHz.toFixed(1)} Hz`).join(', ')
                  : 'No dropped persistent frequencies'}
              </strong>
            </div>

            <div className="comparison-card comparison-card-wide">
              <span className="candidate-label">Confidence shifts</span>
              {comparison.confidenceChanges.length > 0 ? (
                <ul className="comparison-list">
                  {comparison.confidenceChanges.map((change) => (
                    <li key={change.frequencyHz}>
                      {change.frequencyHz.toFixed(1)} Hz looks {change.direction} (
                      {change.beforeConfidencePercent}% to {change.afterConfidencePercent}%)
                    </li>
                  ))}
                </ul>
              ) : (
                <strong>No overlapping persistent candidates to compare.</strong>
              )}
            </div>
          </div>
        ) : (
          <p className="empty-state">
            Select two snapshots to compare which persistent frequencies appeared, dropped, or
            possibly changed.
          </p>
        )}
      </section>
    </div>
  );
}

export default InvestigationView;
