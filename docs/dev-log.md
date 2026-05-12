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
