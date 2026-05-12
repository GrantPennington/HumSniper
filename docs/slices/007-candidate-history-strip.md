# Slice 007 — Candidate History Strip

## Goal

Add a compact in-memory history view so users can tell whether the current hum candidate and any active family pattern are stable, drifting, or intermittent over time.

---

## Requirements

- Keep a rolling in-memory history of recent main candidate readings
- Store only lightweight derived values:
  - timestamp
  - candidate frequency
  - confidence and status
  - optional family label
- Add a compact stability/history strip near the Monitor view
- Keep the visualization simple and dependency-free
- Keep wording understandable to non-DSP users

---

## Acceptance Criteria

- `npm run build` succeeds
- No network calls are added
- No raw audio is stored
- History is derived and in memory only
- Stop still releases the microphone cleanly
- Existing candidate, family, analysis, and settings views still work

---

## Notes

This slice does not record raw audio or raw FFT frames. It only stores recent derived candidate summaries so the UI can show whether the detection is holding steady, drifting, or appearing intermittently.
