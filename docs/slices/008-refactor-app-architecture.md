# Slice 008 — Refactor App Architecture

## Goal

Reduce `src/App.tsx` complexity without changing detection behavior by moving pure audio constants, types, and helper logic into `src/audio/*`.

---

## Requirements

- Extract pure audio constants into `src/audio/constants.ts`
- Extract shared audio types into `src/audio/types.ts`
- Extract frequency helpers into `src/audio/frequency.ts`
- Extract persistence helpers into `src/audio/persistence.ts`
- Extract harmonic grouping helpers into `src/audio/harmonics.ts`
- Keep `App.tsx` rendering the full current UI

---

## Acceptance Criteria

- `npm run build` succeeds
- `App.tsx` still renders the full interface
- Detection thresholds, ranking, and update cadence remain unchanged
- No network calls are added
- No raw audio is stored

---

## Notes

This slice is intentionally limited. It extracts only pure audio logic and keeps React components in `App.tsx` for now so behavior can be verified before further UI-level refactors.
