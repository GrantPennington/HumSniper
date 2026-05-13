# HumSniper Dev Log

---

## 2026-05-12

### Initial Prototype Complete

Created the first local FFT prototype using:
- React
- TypeScript
- Vite
- Web Audio API

Features:
- Microphone permission flow
- Real-time FFT analysis
- Top 5 low-frequency peaks
- Live frequency visualization
- Proper microphone cleanup

Key observations:
- FFT visualization immediately makes the project feel real
- Web Audio API is less intimidating than expected
- Local-only processing model feels important to the project identity

Next goals:
- Stabilize hum detection
- Add rolling averages
- Improve visualization clarity

### Slice 002 Complete

Added a first pass at stable hum candidate detection on top of the live FFT view.

Features:
- rolling low-frequency FFT smoothing
- short persistence window for low bands
- cautious hum candidate panel
- confidence percentage and status label
- highlighted common mains hum bands

Key observations:
- smoothing makes the live peaks much easier to read
- persistence is more useful than single-frame peaks for hum-like signals
- the UI needs careful wording to avoid implying certainty

Next goals:
- tune thresholds with more real room noise
- add lightweight history or trend cues
- separate hum-like narrow tones from broader low-frequency noise

### Slice 003 Complete

Added a debug-oriented analysis layer to make the hum candidate selection easier to inspect.

Features:
- top persistent candidate list
- per-candidate average strength and persistence percentage
- optional mains-band labels
- sub-20Hz rumble filter toggle for the main candidate
- explanatory UI note for rumble vs audible hum

Key observations:
- very low-frequency energy can dominate a heuristic even when it is more felt than heard
- showing multiple persistent candidates makes threshold tuning easier
- the candidate explanation panel reduces "why did it pick that?" confusion

Next goals:
- compare neighboring harmonics more explicitly
- add lightweight history for candidate stability over time
- tune the rumble cutoff and confidence thresholds with more room samples

### Slice 004 Complete

Added user-facing detection tuning controls so noisy rooms can be interpreted more intentionally.

Features:
- detection settings panel
- rumble cutoff slider
- minimum persistence slider
- minimum average strength slider
- Sensitive, Balanced, and Strict presets
- live control updates without restarting the microphone

Key observations:
- a slightly higher rumble cutoff helps audible hum stand out in vibration-heavy spaces
- minimum persistence and minimum strength need to be tuned together
- presets make the app more approachable than raw DSP-style controls alone

Next goals:
- group harmonics into hum families
- add short candidate history so users can see drift
- compare how presets behave across different rooms and devices

### Slice 005 Complete

Reorganized the interface into clearer investigation views so the first screen feels calmer and more instrument-like.

Features:
- Monitor, Analysis, and Settings sections
- simpler default monitor view
- advanced controls moved out of the primary path
- improved spacing, labels, and helper text

Key observations:
- the app feels much easier to approach when monitoring is separated from tuning
- analysis details are still useful, but they should not compete with the main candidate view
- tabbed organization reduces clutter without removing any local-only functionality

Next goals:
- group harmonics into hum families
- add short candidate history so users can see drift
- compare monitor behavior across rooms and microphones

### Slice 006 Complete

Added simple harmonic grouping so related bands can be shown as possible 50 Hz or 60 Hz hum families.

Features:
- 50 Hz family grouping
- 60 Hz family grouping
- matched harmonic band summaries
- combined family score
- family explanations near the main candidate view

Key observations:
- grouped bands are easier to interpret than isolated peaks
- 50/100/150 and 60/120/180 patterns feel more like real source signatures
- family summaries help explain why several nearby bands may belong together

Next goals:
- add short candidate history so users can see drift
- compare hum family behavior across rooms and microphones
- refine family scoring with real-world examples

### Slice 007 Complete

Added a compact candidate history strip so stability and intermittence are easier to judge at a glance.

Features:
- rolling in-memory candidate history
- stability summary label
- compact recent tick strip
- optional family context attached to history entries

Key observations:
- short history makes persistent patterns easier to trust
- intermittent candidates stand out much more clearly once gaps are visible
- family-aware history adds context without turning the Monitor view into a chart

Next goals:
- show which family contributed to each history segment more explicitly
- compare monitor stability across rooms and microphones
- refine stability scoring against real examples

### Slice 008 Partial Complete

Started the app-architecture refactor by extracting pure audio constants, types, and helper logic out of `App.tsx`.

Features:
- shared audio constants module
- shared audio types module
- extracted frequency helpers
- extracted persistence helpers
- extracted harmonic grouping helper

Key observations:
- the audio logic is much easier to scan once the React UI is separated from the calculation code
- keeping this step behavior-preserving made the extraction straightforward
- `App.tsx` is still large, but the highest-churn analysis logic is now isolated

Next goals:
- extract Monitor, Analysis, and Settings views into presentational components
- keep verifying that refactors do not change the detector behavior
- reduce `App.tsx` down to orchestration only

### Slice 009 Complete

Extracted the three main tab views into presentational React components while keeping all audio state and lifecycle logic in `App.tsx`.

Features:
- Monitor view component
- Analysis view component
- Settings view component
- explicit typed props for view data and handlers

Key observations:
- `App.tsx` is much easier to scan once the large JSX blocks are removed
- keeping the views presentational avoided any detector behavior changes
- the next refactor step can focus on smaller shared UI pieces rather than core orchestration

Next goals:
- extract repeated panel sections into smaller leaf components where useful
- keep `App.tsx` focused on orchestration only
- continue verifying that refactors do not change the live detector behavior

### Slice 010 Complete

Added an investigation snapshot workflow for comparing derived hum analysis across room states like baseline, AC on, or laptop fan load.

Features:
- Investigation tab
- in-memory snapshot capture
- editable snapshot labels
- stored main candidate, top persistent candidates, family summaries, stability, and settings
- lightweight two-snapshot comparison
- explicit privacy note explaining that raw audio is not stored

Key observations:
- comparing room states is much easier when derived analysis can be frozen into named checkpoints
- approximate language matters because the detector is comparing summarized candidates, not full spectra
- keeping snapshots session-only preserves the privacy-first shape of the app while validating the workflow

Next goals:
- refine snapshot comparison language with more real room-state examples
- consider session export of derived summaries only if it remains strictly local
- continue breaking `App.tsx` into smaller orchestration helpers without changing detector behavior

### Slice 011 Complete

Added a minimal Tauri v2 desktop shell so HumSniper can run as a native desktop window while preserving the existing local-only frontend behavior.

Features:
- Tauri v2 shell
- desktop dev and build scripts
- minimal desktop capability setup
- desktop icon asset generation and wiring

Key observations:
- the app remains mostly browser-driven, which keeps the desktop wrapper simple
- local-only audio analysis translates cleanly into a desktop container
- desktop workflow still depends on the host machine having the right Rust and WebView tooling

Next goals:
- make the interface feel more like a dense desktop instrument than a centered web page
- use horizontal space more effectively in the Monitor view
- keep verifying microphone release behavior in both browser and desktop modes

### Slice 012 Complete

Reworked the app shell and dashboard layout so HumSniper reads more like a desktop investigation instrument and less like a single narrow web page.

Features:
- compact desktop-style top control and status bar
- denser shell spacing and wider content surface
- monitor dashboard with faster primary candidate visibility
- integrated live spectrum panel with nearby peak context
- more consistent panel hierarchy across Monitor, Analysis, Settings, and Investigation

Key observations:
- moving controls and status into a persistent top bar makes navigation and microphone state easier to scan
- the Monitor view benefits from a two-column desktop layout more than from additional UI chrome
- keeping the pass presentation-only made it straightforward to preserve audio and detection behavior

Next goals:
- add richer frequency history without turning the monitor into a diagnostics wall
- improve desktop-specific setup diagnostics for missing Rust or WebView prerequisites
- refine investigation comparison language with more real room-state examples

Wrapped the existing Vite app in a minimal Tauri v2 desktop shell without changing the frontend analysis workflow.

Features:
- `src-tauri` desktop shell added
- Vite dev server wired into Tauri desktop development
- built `dist/` output wired into desktop packaging
- minimal Tauri capability limited to `core:default`
- desktop window defaults for title, size, and resize behavior
- new desktop dev/build npm scripts
- README and slice docs updated for Windows + WSL + MSVC workflow

Key observations:
- Tauri fits the existing local-only architecture cleanly because the frontend can remain unchanged
- keeping capabilities minimal avoids widening the local security surface unnecessarily
- Windows desktop development needs explicit documentation when the repo lives in WSL because MSVC and Rust still execute on the Windows side

Next goals:
- verify desktop microphone behavior across more Windows machines and WebView2 versions
- decide whether derived snapshot export/import should land before any heavier desktop-specific polish
- keep the desktop shell thin so the browser and desktop paths stay behavior-aligned
