# Changelog

## 1.2.2 — November 7, 2026
- Replaced straight trail segments with bounded cubic curves and speed-adaptive jitter filtering.
- Added visual hand continuity across detector reordering and brief handedness-confidence changes.
- Reconnect plausible tracking gaps up to 200 ms; reject isolated fingertip spikes and break strokes on long losses or remote reacquisition.
- Increased camera sampling ceiling from the prior 55 ms interval to 28 ms, subject to available video frames and inference speed.
- Kept visual smoothing separate from recognition and preserved the 1.4-second fade.
- Added seven trail robustness regressions and browser coverage with dropped detections and unstable labels.

## 1.2.1 — November 7, 2026
- Added an Enable trails camera toggle with cyan and pink index-fingertip paths, fading over 1.4 seconds.
- Trails work without gesture calibration in combined and hand profiles, remember the local toggle preference, and break across tracking loss or implausible jumps.
- Trails clear when disabled or the camera stops; rendering is separate from recognition.

## 1.2.0 — November 7, 2026
- Made combined face and both-hand tracking the default for new profiles.
- Added learned held-pose and short-motion gestures in the same vocabulary.
- Added per-gesture neutral capture, channel selection, temporal matching, tracking-loss rejection, and shared command rearming.
- Freeze automatic scanning during a swipe; reject reversed/static/ambiguous trajectories and return-stroke repeats.
- Added visible channel indicators and two-hand landmark overlays.
- Preserved classic face/hand profiles, exports and drafts; provided a new-profile upgrade path.
- Show the Insert text field only when relevant.
- Added combined recognition and browser regression coverage. Real-user accuracy for the new inputs still requires measurement.

## 1.1.0 — November 7, 2026
- Added explicit local word completion with priority for personal names and vocabulary.
- Added a personal phrase board accessible with the same next/select gestures.
- Added Save phrase to preserve a self-authored message as a shortcut.
- Added automatic, profile-specific local draft recovery.
- Added Signal studio: live match distances, decision-gate state, training-overlap diagnostics, practice milestones, and measured error breakdowns.
- Extended evidence exports with diagnostics and separate fresh-attempt outcomes.
- Added a larger focus view, reachable from the gesture keyboard.
- Preserved compatibility with original saved profiles and exports.
- Prevented camera acquisition if the local vision runtime fails to load.
- Prevented scan audio from interrupting a user-confirmed spoken message.
- Added 12 logic tests and an enhanced browser workflow test.
- Documented a product-validation and commercialization roadmap without unverified outcome claims.

Existing caveats remain: no intended-user evaluation yet; real-world recognition accuracy and audible output still need measurement.
