# Slice 003 — Analysis Debug Panel + Rumble Filter

## Goal

Make the persistent hum detector easier to understand by showing multiple ranked candidates and allowing very low-frequency rumble to be excluded from the main hum candidate.

---

## Requirements

- Add a small analysis/debug panel
- Show the top persistent frequency candidates
- For each candidate, show:
  - approximate frequency
  - average strength
  - persistence/confidence percentage
  - optional mains-band label
- Add a toggle to ignore sub-20Hz rumble for the main hum candidate
- Keep sub-20Hz frequencies visible in the analysis list
- Add a short note explaining that sub-20Hz activity may be rumble rather than audible hum

---

## Acceptance Criteria

- `npm run build` succeeds
- No network calls are added
- No raw audio is stored
- Microphone cleanup still works
- Main candidate can ignore frequencies below 20Hz
- Sub-20Hz frequencies still appear in the analysis list
- UI remains understandable

---

## Notes

This slice keeps all analysis in memory only.

The rumble filter is intentionally narrow:
- it affects only the main hum candidate choice
- it does not hide low-frequency activity from the debug list
- it does not claim that frequencies below 20Hz are invalid, only that they are often less useful as an audible hum candidate
