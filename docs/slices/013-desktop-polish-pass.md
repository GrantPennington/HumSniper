# Slice 013: Desktop Polish Pass

## Goal

Refine HumSniper so it feels more like focused desktop investigation software and less like a responsive web dashboard.

## Scope

- compress the top area into a toolbar-style control strip
- improve density and spacing across the desktop shell
- stabilize panel proportions
- improve overflow handling for compact lists and labels
- keep all logic and privacy behavior unchanged

## What Changed

### Toolbar Pass

Updated `src/App.tsx` so the top area is now a compact utility strip instead of a hero-like header:

- reduced branding emphasis
- shorter status copy
- denser view and capture summary cards
- tighter tab and Start/Stop control placement
- smaller privacy and status line treatment

### Dashboard Polish

Updated `src/components/MonitorView.tsx` to better support desktop use:

- Top Peaks now includes compact metadata
- the peaks mini-list uses a constrained internal scroll area
- helper content remains nearby without expanding the whole page

### Layout and Overflow

Updated `src/styles.css` with a denser desktop rhythm:

- smaller header and panel padding
- tighter control sizing
- reduced spacing between sections
- intentional desktop width constraints
- truncated utility labels where appropriate
- capped Top Peaks height with internal scrolling
- reduced spectrum and list-driven page growth

## Behavior Preservation

This slice is presentation-only:

- no detection behavior changes
- no audio pipeline changes
- no investigation logic changes
- no new features
- no network calls
- no telemetry
- no raw audio storage

Monitor, Analysis, Settings, and Investigation remain available and the Start/Stop microphone lifecycle remains unchanged.

## Verification

Verified in this environment:

1. `npm run build` succeeds.

Desktop verification note:

- `npm run desktop:dev` still depends on local Rust/Tauri prerequisites.
- In this environment, the remaining failure is host-tooling related if `cargo` is unavailable.

## Result

HumSniper now uses space more like a desktop utility: smaller top chrome, denser instrument panels, and controlled overflow instead of page-length growth from secondary lists.
