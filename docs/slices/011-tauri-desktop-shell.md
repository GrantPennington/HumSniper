# Slice 011: Tauri Desktop Shell

## Goal

Wrap the existing HumSniper Vite app in a lightweight Tauri v2 desktop shell so it can run as a standalone desktop application without changing the existing browser-based audio workflow.

## Scope

- add Tauri v2 to the project with a minimal `src-tauri` structure
- keep the existing React + TypeScript frontend intact
- use the Vite dev server during desktop development
- use the built `dist/` output for desktop builds
- keep permissions/capabilities minimal
- document the Windows + WSL + MSVC workflow clearly

## What Changed

### Desktop Shell

Added a small Tauri v2 shell under `src-tauri/`:

- `Cargo.toml`
- `build.rs`
- `src/main.rs`
- `src/lib.rs`
- `tauri.conf.json`
- `capabilities/default.json`

The Rust side intentionally stays tiny. It only boots Tauri and loads the existing frontend.

### Frontend Integration

Updated `package.json` with:

- `desktop:dev`
- `desktop:build`

Updated `vite.config.ts` so Tauri desktop development can reuse the Vite dev server cleanly with:

- fixed dev port `5173`
- `strictPort: true`
- optional `TAURI_DEV_HOST`
- `clearScreen: false`

This preserves the normal browser workflow while matching the official Tauri + Vite pattern for desktop development.

### Permissions

Added a single Tauri capability for the main window:

- `main-capability`
- permissions: `core:default`

No extra plugins were added. No filesystem, shell, dialog, updater, or network-oriented plugin permissions were introduced.

### Documentation

Updated:

- `README.md`
- `docs/dev-log.md`
- `docs/roadmap.md`

Added:

- `docs/slices/011-tauri-desktop-shell.md`

## Privacy / Local-First Impact

This slice keeps the existing privacy boundary intact:

- no backend added
- no uploads added
- no telemetry added
- no raw microphone audio storage added
- no raw FFT storage added

The desktop shell simply hosts the existing frontend in a native window.

## Platform Notes

### Windows + WSL

If the repository lives in WSL, desktop development still needs to run from Windows after loading the MSVC build environment.

That is because Tauri’s Windows build path depends on Windows-native Rust/MSVC tooling even if the source tree is stored inside WSL.

### Microphone Permissions

HumSniper still relies on Web Audio APIs inside the desktop WebView.

On Windows, the first desktop launch may require:

- OS microphone permission approval
- WebView2 permission approval

This is expected and should be treated as part of local device permissioning, not as application-level audio storage or upload behavior.

## Verification Plan

Expected verification for this slice:

1. `npm run build` succeeds.
2. `npm run dev` still works for browser development.
3. `npm run desktop:dev` is run from a Windows terminal with the MSVC environment loaded.
4. microphone access is manually confirmed in the Tauri window.
5. existing snapshot and comparison workflow is manually checked inside the desktop shell.

## Result

HumSniper now has a thin desktop wrapper while preserving the existing local-only analysis model and browser-oriented frontend architecture.
