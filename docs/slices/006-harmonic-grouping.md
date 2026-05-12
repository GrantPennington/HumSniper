# Slice 006 — Harmonic Grouping

## Goal

Group related persistent bands into simple 50 Hz and 60 Hz families so HumSniper can explain patterns like `50/100/150` or `60/120/180/240` without replacing the existing single-frequency candidate.

---

## Requirements

- Detect possible 50 Hz and 60 Hz families
- Check nearby harmonic bands under 300 Hz
- Use a tolerant matching window for real-world drift
- Show a Hum Families panel with:
  - family label
  - matched bands
  - combined score
  - short explanation
- Keep analysis/debug details intact
- Keep wording cautious and non-diagnostic

---

## Acceptance Criteria

- `npm run build` succeeds
- No network calls are added
- No raw audio is stored
- Microphone cleanup still works
- Existing monitor, analysis, and settings views continue working
- No-match cases are handled cleanly

---

## Notes

This slice groups existing persistent candidates rather than introducing a new signal-processing pipeline.

A single source can create energy at multiples of a base frequency. Those multiples are harmonics, so a repeating pattern across several bands can be more informative than one isolated peak.
