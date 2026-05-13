import type {
  CandidateHistoryEntry,
  FrequencyPeak,
  HumCandidate,
  HumFamily,
  MainsBandReading,
  StabilityState,
} from '../audio/types';

type MonitorViewProps = {
  humCandidate: HumCandidate;
  mainsBands: MainsBandReading[];
  humFamilies: HumFamily[];
  stabilityState: StabilityState;
  candidateHistory: CandidateHistoryEntry[];
  latestHistoryEntry: CandidateHistoryEntry | null;
  bars: number[];
  peaks: FrequencyPeak[];
};

function MonitorView({
  humCandidate,
  mainsBands,
  humFamilies,
  stabilityState,
  candidateHistory,
  latestHistoryEntry,
  bars,
  peaks,
}: MonitorViewProps) {
  const primaryFamily = humFamilies[0] ?? null;

  return (
    <div className="view-stack monitor-dashboard">
      <section className="candidate-panel monitor-primary-panel">
        <div className="section-heading">
          <h2>Monitor Dashboard</h2>
          <span>Rolling 3.8 second detection view</span>
        </div>

        <div className="candidate-grid">
          <div className="candidate-card candidate-card-primary">
            <span className="candidate-label">Primary candidate</span>
            <strong>
              {humCandidate.frequencyHz !== null
                ? `${humCandidate.frequencyHz.toFixed(1)} Hz`
                : 'No clear candidate'}
            </strong>
          </div>

          <div className="candidate-card">
            <span className="candidate-label">Confidence</span>
            <strong>{humCandidate.confidencePercent}%</strong>
          </div>

          <div className="candidate-card">
            <span className="candidate-label">Status</span>
            <strong>{humCandidate.status}</strong>
          </div>

          <div className="candidate-card">
            <span className="candidate-label">Primary family hint</span>
            <strong>{primaryFamily ? primaryFamily.label : 'No active family'}</strong>
          </div>
        </div>

        <p className="candidate-note">
          This is a local candidate only. It helps you investigate recurring hum, not diagnose it
          with certainty.
        </p>

        <div className="mains-band-row" aria-label="Common mains hum bands">
          {mainsBands.map((band) => (
            <span
              key={band.frequencyHz}
              className={`mains-chip ${band.highlighted ? 'mains-chip-active' : ''}`}
              title={`Persistent intensity ${band.intensity}%`}
            >
              {band.frequencyHz} Hz
              {humCandidate.nearestMainsBandHz === band.frequencyHz ? ' candidate' : ''}
            </span>
          ))}
        </div>
      </section>

      <section className="visualizer-panel monitor-spectrum-panel">
        <div className="section-heading">
          <h2>Integrated Spectrum</h2>
          <span>Smoothed low-frequency view under 300 Hz</span>
        </div>

        <section className="visualizer" aria-label="Low frequency visualization">
          {bars.map((magnitude, index) => (
            <div key={index} className="bar-slot">
              <div
                className="bar-fill"
                style={{ height: `${Math.max(6, (magnitude / 255) * 100)}%` }}
              />
            </div>
          ))}
        </section>

        <div className="spectrum-summary-grid">
          <div className="spectrum-summary-card">
            <div className="spectrum-card-header">
              <span className="candidate-label">Top peaks</span>
              <span className="spectrum-card-meta">{peaks.length} tracked</span>
            </div>
            {peaks.length > 0 ? (
              <ul className="peak-list peak-list-compact peak-list-scroll">
                {peaks.map((peak) => (
                  <li key={`${peak.frequencyHz}-${peak.magnitude}`} className="peak-item">
                    <span>{peak.frequencyHz.toFixed(1)} Hz</span>
                    <span>{Math.round(peak.magnitude)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">No low-frequency peaks detected yet.</p>
            )}
          </div>

          <div className="spectrum-summary-card">
            <div className="spectrum-card-header">
              <span className="candidate-label">What to watch</span>
            </div>
            <p className="family-note">
              A persistent hum usually looks steadier than room rumble. Repeating 50 Hz or 60 Hz
              patterns often indicate related harmonics rather than isolated peaks.
            </p>
          </div>
        </div>
      </section>

      <section className="history-panel">
        <div className="section-heading">
          <h2>Stability History</h2>
          <span>Recent candidate changes</span>
        </div>

        <div className="history-summary">
          <strong>{stabilityState}</strong>
          <span>
            A persistent hum should appear as a steady pattern over time rather than jumping around
            or disappearing between updates.
          </span>
        </div>

        {candidateHistory.length > 0 ? (
          <>
            <div className="history-strip" aria-label="Recent hum candidate history">
              {candidateHistory.map((entry) => (
                <div
                  key={entry.timestamp}
                  className={`history-tick ${
                    entry.candidateFrequencyHz === null
                      ? 'history-tick-empty'
                      : entry.familyLabel !== null
                        ? 'history-tick-family'
                        : ''
                  }`}
                  style={{
                    height: `${Math.max(22, (entry.confidencePercent / 100) * 72)}px`,
                  }}
                  title={
                    entry.candidateFrequencyHz !== null
                      ? `${entry.candidateFrequencyHz.toFixed(1)} Hz, ${entry.confidencePercent}%`
                      : 'No clear candidate'
                  }
                />
              ))}
            </div>

            <div className="history-caption-row">
              <span>Older</span>
              <span>
                Latest:{' '}
                {latestHistoryEntry !== null && latestHistoryEntry.candidateFrequencyHz !== null
                  ? `${latestHistoryEntry.candidateFrequencyHz.toFixed(1)} Hz`
                  : 'No clear candidate'}
              </span>
            </div>

            <p className="history-note">
              Blue ticks mark candidate updates. Brighter ticks indicate a possible harmonic family
              was active for that reading.
            </p>
          </>
        ) : (
          <p className="empty-state">History will begin once a few candidate updates arrive.</p>
        )}
      </section>

      <section className="family-panel">
        <div className="section-heading">
          <h2>Hum Families</h2>
          <span>Grouped harmonic patterns under 300 Hz</span>
        </div>

        <p className="family-note">
          Matched bands are possible family hints only. A recurring source can create energy at
          multiples of a base frequency, which is why 50 Hz or 60 Hz patterns often show up in
          related bands.
        </p>

        {humFamilies.length > 0 ? (
          <ul className="family-list">
            {humFamilies.map((family) => (
              <li key={family.baseFrequencyHz} className="family-item">
                <div>
                  <strong>{family.label}</strong>
                  <p className="family-explanation">{family.explanation}</p>
                </div>
                <span>matched bands {family.matchedBandsHz.join(', ')} Hz</span>
                <span>combined score {family.combinedScore}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">No clear 50 Hz or 60 Hz family matches are visible right now.</p>
        )}
      </section>
    </div>
  );
}

export default MonitorView;
