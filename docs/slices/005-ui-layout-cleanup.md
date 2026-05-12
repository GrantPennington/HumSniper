# Slice 005 — UI Layout Cleanup

## Goal

Reorganize HumSniper into clearer views so it feels like a focused audio investigation instrument instead of a crowded control panel.

---

## Requirements

- Separate the UI into Monitor, Analysis, and Settings views
- Keep the default view simple and non-intimidating
- Preserve existing controls and detection behavior
- Keep advanced information available but visually secondary
- Improve spacing, labels, and helper text

---

## Acceptance Criteria

- `npm run build` succeeds
- Existing detection behavior still works
- Start and Stop still release the microphone correctly
- Settings still update live
- Debug analysis remains accessible
- No network calls are added
- No raw audio is stored

---

## Notes

This slice is primarily presentation work.

The detection pipeline, local-only processing model, and microphone cleanup behavior remain unchanged. The main change is visual organization:
- Monitor focuses on the live candidate and spectrum
- Analysis exposes ranked persistent candidates and explanations
- Settings groups presets and detection thresholds in one place
