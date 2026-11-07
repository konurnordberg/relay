# Changelog

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
