# Slice 010 — Investigation Snapshots

## Goal

Add an in-memory investigation workflow so users can capture lightweight derived analysis snapshots of different room states and compare what changed.

---

## Requirements

- Add an Investigation tab
- Add a Capture Snapshot button
- Store snapshots in memory only for this slice
- Store derived analysis values only
- Do not store raw microphone audio
- Do not store raw FFT frames
- Allow short editable labels per snapshot
- Show a snapshot list with timestamp, main candidate, family, and stability summary
- Allow two snapshots to be selected and compared
- Keep comparison approximate and clearly worded

---

## Acceptance Criteria

- `npm run build` succeeds
- Existing Monitor, Analysis, and Settings views still work
- Start and Stop still release the microphone
- Snapshot capture works while listening
- Snapshot labels can be edited
- Two snapshots can be selected and compared
- Comparison uses only derived snapshot data
- No network calls are added
- No raw audio is stored
- No raw FFT frames are stored

---

## Notes

Snapshots intentionally store only:
- current main hum candidate summary
- top persistent candidate summaries
- active family summaries
- stability state
- current detection settings

This slice keeps everything session-only. Refreshing the page clears snapshots.
