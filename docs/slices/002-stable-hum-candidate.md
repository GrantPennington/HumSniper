# Slice 002 — Stable Hum Candidate Detection

## Goal

Reduce noisy FFT flicker and add a cautious persistent-hum candidate view that stays understandable to non-DSP users.

---

## Requirements

- Smooth low-frequency FFT bins under 300 Hz
- Track persistence over a short rolling window
- Show a hum candidate panel with:
  - strongest persistent frequency
  - approximate confidence percentage
  - status label
- Highlight common mains hum bands:
  - 50 Hz
  - 60 Hz
  - 100 Hz
  - 120 Hz
  - 150 Hz
  - 180 Hz
  - 240 Hz
- Keep wording cautious and non-diagnostic
- Preserve local-only, in-memory processing

---

## Acceptance Criteria

- `npm run build` succeeds
- No network calls are added
- No raw audio is stored
- Microphone still fully stops on cleanup
- Existing live spectrum still works
- Hum candidate panel updates while listening

---

## Notes

This slice uses a pragmatic heuristic rather than advanced DSP:
- a rolling average smooths individual FFT bins
- a short history window estimates whether a frequency keeps recurring
- confidence is only approximate and should be treated as a UI hint

The purpose is to make the prototype more stable without overengineering it yet.
