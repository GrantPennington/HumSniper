import { DETECTION_PRESETS } from '../audio/constants';
import type { DetectionSettings } from '../audio/types';

type SettingsViewProps = {
  settings: DetectionSettings;
  onApplyPreset: (preset: DetectionSettings) => void;
  onRumbleCutoffChange: (value: number) => void;
  onMinimumPersistenceChange: (value: number) => void;
  onMinimumAverageStrengthChange: (value: number) => void;
};

function SettingsView({
  settings,
  onApplyPreset,
  onRumbleCutoffChange,
  onMinimumPersistenceChange,
  onMinimumAverageStrengthChange,
}: SettingsViewProps) {
  return (
    <div className="view-stack">
      <section className="settings-panel">
        <div className="section-heading">
          <h2>Detection Settings</h2>
          <span>Updates live while listening</span>
        </div>

        <p className="settings-note">
          Use presets for quick tuning, then adjust sliders if your room is unusually noisy or
          vibration-heavy.
        </p>

        <div className="preset-row">
          {Object.entries(DETECTION_PRESETS).map(([presetName, presetSettings]) => (
            <button
              key={presetName}
              type="button"
              className="preset-button"
              onClick={() => onApplyPreset(presetSettings)}
            >
              {presetName}
            </button>
          ))}
        </div>

        <div className="settings-grid">
          <label className="setting-control">
            <span>Rumble cutoff</span>
            <strong>{settings.rumbleCutoffHz} Hz</strong>
            <input
              type="range"
              min="10"
              max="40"
              step="1"
              value={settings.rumbleCutoffHz}
              onChange={(event) => onRumbleCutoffChange(Number(event.target.value))}
            />
          </label>

          <label className="setting-control">
            <span>Minimum persistence</span>
            <strong>{settings.minimumPersistencePercent}%</strong>
            <input
              type="range"
              min="10"
              max="80"
              step="1"
              value={settings.minimumPersistencePercent}
              onChange={(event) => onMinimumPersistenceChange(Number(event.target.value))}
            />
          </label>

          <label className="setting-control">
            <span>Minimum average strength</span>
            <strong>{settings.minimumAverageStrength.toFixed(0)}</strong>
            <input
              type="range"
              min="8"
              max="60"
              step="1"
              value={settings.minimumAverageStrength}
              onChange={(event) => onMinimumAverageStrengthChange(Number(event.target.value))}
            />
          </label>
        </div>

        <p className="settings-note">
          Lower cutoff values allow more vibration and rumble to compete. Higher cutoff values
          focus the main hum candidate on more audible low-frequency tones.
        </p>
      </section>
    </div>
  );
}

export default SettingsView;
