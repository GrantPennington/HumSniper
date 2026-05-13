# HumSniper

Privacy-first local audio investigation for persistent hum, vibration, and low-frequency noise.

## Screenshots

TODO: add main monitor screenshot

TODO: add investigation snapshots comparison screenshot

TODO: add short GIF of live monitor workflow

## What HumSniper Is

HumSniper is a small local analysis tool for investigating environmental low-frequency behavior through your microphone.

It is designed for questions like:

- Is that low hum actually persistent, or just momentary noise?
- Does the room change when the AC turns on?
- Is a laptop fan introducing a new 120 Hz or 240 Hz pattern?
- Does a frequency stay stable over time, or drift around?

The app focuses on derived analysis and comparison, not recording. All analysis happens locally on-device in the browser runtime used by either the web app or the desktop shell.

## Why It Exists

A lot of environmental noise investigation sits in an awkward middle ground.

Consumer audio tools are often too shallow to explain what changed, while more advanced acoustic software can feel heavy, expensive, or aimed at a different workflow entirely. HumSniper exists to explore that middle space: a local-first engineering tool for inspecting persistent low-frequency patterns without turning the user into a DSP specialist.

It is intentionally narrow in scope. The goal is to help make invisible room-state changes easier to notice and compare.

## Current Features

- Real-time FFT spectrum visualization under 300 Hz
- Persistent hum candidate detection based on rolling stability and strength
- Harmonic grouping for possible 50 Hz and 60 Hz families
- Candidate history and stability tracking
- Investigation snapshots for different room states
- Two-snapshot comparison using derived analysis summaries
- Detection tuning controls with presets and sliders
- Local-only processing in the browser runtime
- Lightweight Tauri desktop shell for standalone desktop use
- No raw audio storage
- No telemetry, tracking, or network uploads

## Privacy Philosophy

HumSniper is built around a strict local-first boundary.

- Microphone input is analyzed locally on your device.
- HumSniper does not upload microphone audio.
- HumSniper does not store raw microphone audio.
- HumSniper does not store raw FFT frames.
- Investigation snapshots store only lightweight derived frequency-analysis summaries.
- There is no backend, no auth, and no telemetry in the current app.
- The desktop shell adds no backend API layer and no new audio storage behavior.

For the current snapshot workflow, captured states live only in memory for the active session and clear on page refresh.

## Investigation Workflow Examples

Typical ways to use the current app:

### Baseline vs AC On

1. Start listening in a quiet baseline room state.
2. Capture a snapshot labeled `baseline`.
3. Turn on the AC or HVAC source.
4. Wait a few seconds for persistent candidates to settle.
5. Capture another snapshot labeled `AC on`.
6. Compare the two snapshots to see which persistent frequencies appeared, dropped, or got stronger.

### Laptop Idle vs Fan Load

1. Capture a snapshot while the machine is idle.
2. Start a workload that spins up the fan.
3. Capture a second snapshot.
4. Compare for stronger bands near likely mains-related frequencies or harmonics.

### Charger / Lights / Monitor Changes

1. Capture a baseline state.
2. Change one thing in the environment.
3. Capture again.
4. Use the comparison view to check whether a persistent band or family summary possibly changed.

The comparison language is intentionally cautious. It works from saved summaries, so it describes changes as appeared, dropped, stronger, weaker, or possibly changed.

## Harmonic Grouping, In Plain Terms

Some hum sources do not show up as just one frequency.

If a source is related to mains power or repeating mechanical vibration, it may produce energy at a base frequency and at multiples of that frequency. For example, a 60 Hz-related source may also show visible bands near 120 Hz, 180 Hz, or 240 Hz.

HumSniper groups those related bands into simple 50 Hz and 60 Hz family hints. This does not prove a source, but it makes repeating patterns easier to recognize than looking at isolated peaks alone.

## Experimental Status

HumSniper is an experimental investigation tool. It is not a calibrated scientific acoustic instrument, not a certified measurement system, and not a substitute for proper environmental or electrical diagnosis.

It is best treated as a local exploratory instrument for noticing patterns and comparing states.

## Tech Stack

- Vite
- React
- TypeScript
- Web Audio API
- Tauri v2 desktop shell

## Getting Started

### Requirements

- Node.js
- npm
- A browser with microphone access for web development

### Browser Development

```bash
npm install
npm run dev
```

Then open the local Vite URL in your browser and allow microphone access when prompted.

### Browser Production Build

```bash
npm run build
```

### Preview Browser Production Build

```bash
npm run preview
```

## Desktop Shell

HumSniper now includes a minimal Tauri v2 desktop shell in [`src-tauri`](./src-tauri).

The shell wraps the existing Vite app. It does not rewrite the frontend, does not add backend APIs, and does not add telemetry, uploads, or raw audio storage.

### Desktop Prerequisites

- Node.js and npm
- Rust toolchain installed on Windows
- Microsoft Visual C++ Build Tools installed on Windows
- WebView2 runtime on Windows

### Windows + WSL Development Note

This repository may live inside WSL, but Windows-native Tauri builds still rely on the Windows Rust/MSVC toolchain.

Do not assume `npm run desktop:dev` or `npm run desktop:build` will work fully inside WSL alone. Run the desktop commands from a Windows Command Prompt or PowerShell session after loading the MSVC environment.

### Load the MSVC Environment

In Windows Command Prompt:

```bat
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat"
```

In PowerShell:

```powershell
cmd /c "call \"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat\" && powershell"
```

After the MSVC environment is loaded, change into the repository from Windows using its UNC path or a mapped drive that points at the WSL workspace.

Example:

```powershell
cd \\wsl$\Ubuntu\home\gpennington\hum-sniper
```

### Desktop Development

From a Windows terminal with the MSVC environment loaded:

```bash
npm install
npm run desktop:dev
```

This starts the Vite dev server and launches the Tauri desktop window against `http://localhost:5173`.

### Desktop Build

From a Windows terminal with the MSVC environment loaded:

```bash
npm install
npm run desktop:build
```

This builds the web frontend into `dist/` and then packages the Tauri desktop application from `src-tauri/`.

### Microphone Permissions

HumSniper still uses the browser audio APIs inside the desktop WebView.

- The first run may trigger an OS-level or WebView microphone permission prompt.
- Microphone behavior can vary slightly by platform and WebView runtime.
- No raw microphone audio is stored by HumSniper in either browser or desktop mode.

## Project Structure Overview

```text
src/
  App.tsx                    App-level state and microphone lifecycle orchestration
  main.tsx                   React entry point
  styles.css                 Global styling
  audio/
    constants.ts             Detection constants and presets
    frequency.ts             FFT smoothing and frequency helpers
    harmonics.ts             50 Hz / 60 Hz family grouping logic
    persistence.ts           Rolling persistence, candidate, and stability logic
    snapshots.ts             Derived snapshot capture and comparison helpers
    types.ts                 Shared audio and app types
  components/
    MonitorView.tsx          Live monitoring view
    AnalysisView.tsx         Persistent candidate inspection view
    SettingsView.tsx         Detection tuning controls
    InvestigationView.tsx    Snapshot capture and comparison workflow
src-tauri/
  src/main.rs                Desktop entry point
  src/lib.rs                 Minimal Tauri app builder
  capabilities/default.json  Minimal core capability for the main window
  tauri.conf.json            Desktop shell config and Vite integration
docs/
  vision.md                  Project direction
  roadmap.md                 High-level roadmap
  dev-log.md                 Slice-by-slice implementation notes
  slices/                    Individual slice docs
```

## Current Roadmap / Future Ideas

Near-term directions that fit the current project shape:

- Better environmental comparison workflows
- More expressive snapshot review and annotation
- Local-only export/import of derived snapshot summaries
- Frequency audition so a detected frequency can be heard as a generated reference tone

Longer-term ideas:

- Stronger desktop polish on top of the current Tauri shell
- Raspberry Pi experimentation
- Multi-microphone or multi-position comparisons
- Directional or source-estimation experiments

These are ideas, not promises. The current repository is focused on keeping the core local investigation workflow small, clear, and privacy-first.

## Contributing

Contributions are welcome if they fit the project’s constraints and tone.

Good contributions usually preserve these principles:

- local-first processing
- no raw audio storage
- no telemetry or surprise network behavior
- simple, understandable analysis language
- careful UI scope without turning the app into a cluttered lab console

If you want to contribute, opening an issue or small scoped PR around an existing slice or roadmap direction is a good place to start.

## License

TODO: choose and add a license
