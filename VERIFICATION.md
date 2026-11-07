# Verification record

Software checked November 7, 2026 (Eastern). These are engineering checks, not clinical or human performance results.

- 36 automated logic tests passed (13 original, 12 enhancement, 11 combined-input checks): learned labels, rest/unknown rejection, overlapping gestures, neutral rearming, hold/debounce behavior, all alphabet letters via two controls, editing, confirmation, pause/resume, navigation, profile roundtrip, invalid data and validation accounting.
- Source syntax and all seven bundled vision asset SHA-256 checks passed.
- Headless Chrome UI checks passed: initial page; full composition/editing; profile creation/reload; actual face and hand model initialization with synthetic camera; mobile overflow check; no uncaught browser errors.
- Full synthetic-feature integration passed: guided rest collection; five recordings for each of two signals; trained camera-input path spelling “ab”; prevention of repeat/unknown/lost-tracking selections; export and recognizer reconstruction after reload.
- Actual MediaPipe extraction from a public test portrait passed: one face, 478 landmarks, 52 blendshapes, 60 finite application features.
- Desktop and mobile screenshots were visually reviewed. Mobile navigation and card layout were corrected after review.

Still requires a person:
- Camera permission and device-specific camera behavior in the normal browser.
- Calibration on actual comfortable movements and empirical accuracy / false-activation measurement.
- Listening to the installed system text-to-speech voice.
- Testing with intended AAC users; none has been performed.
- Recording an authentic backup gesture demo and final presentation rehearsal.

The synthetic feature fixture is only in tests; the application has no synthetic recognition mode or preloaded performance scores.

Enhancement coverage: explicit word completion and undo, stale-suggestion rejection, gesture access to phrases and speech confirmation, legacy profile compatibility, malformed vocabulary rejection, overlap diagnostics, measured outcome classification, and isolated draft recovery. Enhanced browser checks exercise these flows, live diagnostics and responsive focus mode using synthetic inputs. A mocked local voice verifies speech ordering; it does not prove audible output on the user’s device.

## Version 1.2 — combined inputs
- Combined logic tests cover face commands with hands absent, two-hand poses requiring both hands, detection-order independence, identity-change rejection, presence-mask handling, own-channel neutral preparation, lost tracking, long-held pose rearming, and motion scan freezing.
- Temporal tests cover modest speed changes, reversed/stationary trajectories, duplicate/ambiguous movements, one event per swipe, and no event on a return stroke.
- Guided browser workflow records 12 seconds of neutral and five movement examples with neutral lead-ins, saves 24-frame sequences, selects a scanning row with the learned swipe, and reloads its profile.
- Actual local face and two-hand model initialization passed. Static public MediaPipe fixtures produced 478 facial landmarks, 52 blendshapes, two sets of 21 hand landmarks, and finite combined features. The hand fixture depicts two right hands; bilateral slot identity is tested separately with controlled inputs.
- Existing browser integration still composes “ab” from two learned signals, exports and reloads; vocabulary/draft/speech regression checks and camera-failure checks passed.
- Final UI checks cover motion diagnostics, conditional Insert text, the no-mode-choice profile dialog, desktop and 390px layouts.
- These checks do not establish real-camera swipe/two-hand accuracy. New inputs still require user calibration and fresh-attempt/rest-check results. Classic profile performance does not transfer to the new schema automatically.

## Version 1.2.1 — fingertip trails
Browser checks passed for the toggle's default and saved preference, actual canvas rendering with controlled fingertip detections, immediate clearing when disabled, full fade after tracking loss, clearing on camera stop, and mobile overflow. The real local vision-model startup and existing writing/control browser regression also passed. The neon trail screenshot was visually reviewed. These are presentation checks, not recognition-accuracy claims.
## Version 1.2.2 — smoother, more robust trails
All 43 logic tests passed, including seven trail regressions for reduced stationary jitter, low-lag fast sweeps, short-gap reconnection, long-loss breaks, stable hand identity, bad-point rejection, bounded curves, expiry and memory bounds. Browser tests rendered curved trails while detections were briefly missing and handedness labels/confidence changed; toggle persistence, fade, cleanup and mobile width passed. Actual model startup and existing writing controls also passed. Visual smoothing uses a separate tracking state and never supplies repaired points to the recognizer. Camera cadence is a ceiling, not a guaranteed device frame rate; the user's laptop still needs a live comparison.
