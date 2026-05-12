# Slice 004 — Detection Tuning Controls

## Goal

Expose a small set of understandable controls so users can tune hum detection in noisier environments without restarting the mic stream.

---

## Requirements

- Add a Detection Settings panel
- Add a rumble cutoff slider from 10Hz to 40Hz
- Add a minimum persistence slider
- Add a minimum average strength slider
- Add Sensitive, Balanced, and Strict presets
- Update analysis live while listening
- Keep low-frequency activity visible in analysis even when excluded from the main candidate

---

## Acceptance Criteria

- `npm run build` succeeds
- No network calls are added
- No raw audio is stored
- Microphone cleanup still works
- Settings update candidate selection live
- Existing FFT, candidate, and analysis panels continue working

---

## Notes

The tuning controls only affect how the app ranks and filters candidates:
- rumble cutoff blocks very low bands from becoming the main candidate
- minimum persistence requires more repeatability across the rolling window
- minimum average strength filters out weaker noisy bands

All analysis remains local and in memory only.
