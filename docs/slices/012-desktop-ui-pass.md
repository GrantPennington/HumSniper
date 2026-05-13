# Slice 012: Desktop UI Pass

## Goal

Make HumSniper feel more like a polished desktop investigation instrument and less like a web page inside a desktop window.

## Scope

- tighten spacing and reduce unnecessary vertical scrolling
- add a compact persistent top control and status bar
- improve monitor dashboard density and hierarchy
- keep the dark technical visual identity
- preserve all detection, audio, privacy, and local-only behavior

## What Changed

### App Shell

Reworked the shell in `src/App.tsx` so the app now opens into a desktop-style frame with:

- persistent title and identity block
- microphone active/inactive state
- Start Listening and Stop Listening controls in the top bar
- current view summary
- tab navigation always visible
- compact privacy and status messaging

This reduces repeated control placement and makes the app feel more native to a desktop workflow.

### Monitor Dashboard

Reworked `src/components/MonitorView.tsx` into a denser dashboard layout:

- primary candidate, confidence, status, and family hint surface immediately
- mains-band chips stay attached to the candidate area
- the spectrum panel is integrated into the main dashboard instead of feeling buried lower in the page
- top peaks are shown adjacent to the spectrum instead of in a disconnected section
- stability history and family summaries remain available but use space more efficiently

### Visual System

Updated `src/styles.css` to support the desktop pass:

- wider layout container
- denser card spacing
- consistent panel treatment
- stronger section hierarchy
- compact controls and tabs
- responsive fallback for browser/mobile-width development

No new dependencies were added.

## Behavior Preservation

This slice is presentation-only:

- no detection logic was changed
- no audio pipeline logic was changed
- no new storage was added
- no raw audio is stored
- no network calls were added
- existing views remain available: Monitor, Analysis, Settings, Investigation
- existing Start/Stop handlers are still the same `App.tsx` microphone lifecycle logic

## Verification

Verified in this environment:

1. `npm run build` succeeds.
2. Existing browser-targeted frontend compiles successfully after the UI changes.

Desktop verification status in this environment:

- `npm run desktop:dev` reaches Tauri CLI but stops because `cargo` is not installed on this machine.
- That is a local Rust tooling prerequisite issue, not a frontend UI regression.

## Result

HumSniper now presents as a more compact desktop investigation console while keeping the existing local-only audio analysis behavior intact.
