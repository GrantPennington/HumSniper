import type { PersistentCandidate } from '../audio/types';

type AnalysisViewProps = {
  rumbleCutoffHz: number;
  persistentCandidates: PersistentCandidate[];
};

function AnalysisView({ rumbleCutoffHz, persistentCandidates }: AnalysisViewProps) {
  return (
    <div className="view-stack">
      <section className="analysis-panel">
        <div className="section-heading">
          <h2>Debug Analysis</h2>
          <span>Why this candidate is being chosen</span>
        </div>

        <p className="analysis-note">
          Frequencies below {rumbleCutoffHz} Hz can still appear here, but they will not become the
          main hum candidate.
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
                    <span className="analysis-tag">near {candidate.nearestMainsBandHz} Hz</span>
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
          <p className="empty-state">Persistent candidates will appear here while listening.</p>
        )}
      </section>
    </div>
  );
}

export default AnalysisView;
