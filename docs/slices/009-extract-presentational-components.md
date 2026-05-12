# Slice 009 — Extract Presentational Components

## Goal

Reduce `src/App.tsx` size by moving the Monitor, Analysis, and Settings tab JSX into typed presentational components, while keeping all audio state, effects, and microphone orchestration in `App.tsx`.

---

## Requirements

- Extract the Monitor tab into `src/components/MonitorView.tsx`
- Extract the Analysis tab into `src/components/AnalysisView.tsx`
- Extract the Settings tab into `src/components/SettingsView.tsx`
- Keep props explicit and typed
- Preserve existing layout, class names, and behavior

---

## Acceptance Criteria

- `npm run build` succeeds
- Existing UI looks the same
- Existing behavior is unchanged
- Start and Stop still work
- Settings still update live
- No network calls are added
- No raw audio is stored

---

## Notes

This slice is presentation-only. `App.tsx` still owns:
- microphone start and stop
- `AudioContext` lifecycle
- animation frame analysis updates
- all state changes
- passing data and handlers into the extracted views
