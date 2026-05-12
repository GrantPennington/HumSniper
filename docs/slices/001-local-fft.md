# Slice 001 — Local FFT Prototype

## Goal

Create the first working HumSniper prototype capable of:
- accessing microphone input
- performing FFT analysis
- visualizing low-frequency activity
- displaying dominant frequencies

---

## Requirements

- Request microphone access
- Create AudioContext
- Use AnalyserNode
- Run FFT continuously
- Display top frequencies below 300 Hz
- Render simple low-frequency graph
- Fully release microphone resources on stop

---

## Acceptance Criteria

- App runs locally with Vite
- FFT updates in real time
- No backend exists
- No audio is uploaded
- No raw audio is stored
- TypeScript build passes
- Microphone fully stops on cleanup

---

## Notes

Initial implementation focuses on simplicity and understandability over DSP accuracy.

The purpose of this slice is:
- proving the concept
- learning the Web Audio API
- building intuition around frequency analysis

Advanced DSP concepts will be introduced incrementally in future slices.