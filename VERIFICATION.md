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

## Version 1.2.3 — fast-motion continuity
- All 50 logic regressions passed, including fast coherent sweeps/reversals at 16.7/33/50 ms sample intervals, a 247 ms reacquisition gap, bounded glow rendering, single in-flight worker frames, independent lanes, cancelled captures, error propagation and stale-result rejection.
- Controlled Chrome pipeline checks passed for independent hand/face cadence, worker startup and runtime fallback, rapid restart, stopped camera tracks and no callbacks after stop. With a deliberately slow face fixture, hands processed 20 frames/s while face processed 10 on a 20 fps synthetic camera.
- Actual bundled MediaPipe hand and face models produced detections from public static fixtures inside GPU workers. The hand fixture produced one detection in this GPU path; this is not evidence of bilateral recognition accuracy.
- Browser trail checks, real model startup, existing writing/editing controls, persistence, no-camera-on-runtime-failure and 390px overflow checks passed. The updated trail preview and FPS readout were visually reviewed.
- A warmed real-runtime synthetic-camera run measured 20 camera fps, 20 hand fps, 14 face fps and 14 ms p95 UI frame interval on this PC. Aggregate callbacks now include two independent channels and must not be compared as a speedup against the old combined callback rate. This does not measure fast-moving human hands or the user's laptop.
- Visual gap repair remains presentation-only; stale recognition channels expire after 200 ms. Profiles retain their schema. Actual laptop fast-swipe performance remains a user test.- Full synthetic-feature guided calibration-to-writing regression also passed: two trained gestures compose “ab”, held/unknown/lost-tracking inputs do not repeat or type, and exported profiles rebuild after reload.


## Version 1.2.4 — movement writing and persistent teaching camera
- Direct-text capability checks passed for movement/pose gestures without Select or Next, disabled/empty mappings, keyboard scanning requirements and undo/pause behavior.
- The new browser regression used the real combined recognizer with controlled motion features to write “hi” from two trained movements without navigation gestures. Holding an endpoint did not repeat text; direct-only writing did not advance the keyboard scan. Shortcut defaults, text mapping display and draft reload passed.
- During recording, camera, mirrored instruction and Cancel recording remained in the viewport after scrolling at 1366×768, 1024×600, 390×844 and 390×640. No horizontal overflow occurred. Cancellation and turning off the camera removed the active/docked states appropriately. Desktop/mobile screenshots were visually reviewed.
- Existing writing/editing UI, real vision-model startup, trail rendering/toggle/fade and responsive browser checks passed. Synthetic movement tests do not establish human handwriting or recognition accuracy.
- Full five-example motion teaching, neutral lead-ins, movement diagnostics, scan freezing, swipe-driven selection and profile reload also passed.


## Version 1.3.0 — communication environments
- All 60 logic tests passed. Nine new tests cover Classic default/profile preference roundtrip, all 36 cells, all printable ASCII across pages and case, shared editing/confirmation, 0–5 geometry under rotation/reflection/scale, malformed/cropped/small/edge-on/ambiguous rejection, preview-side roles, swap, every coordinate, repeat/release behavior, duplicate callbacks, stale frames and held Page prevention.
- Browser integration passed with constructed raw landmark inputs through the actual count estimator and input controller: “hi”, a page change and number, held-key non-repeat, delete/undo and speech cancellation. It also verified learned gestures cannot dispatch during Finger grid, stopping input, six rows/six columns, default/restored environments, shared draft preservation and old face-profile camera restoration.
- Desktop and 390px screenshots were visually reviewed. Camera and latest-message preview remain visible on mobile; the first row is not covered and there is no horizontal overflow.
- Real CPU MediaPipe inference on official public images produced two open-hand counts of 5, fist 0, index-point 1, victory 2 and thumb-up 1. Counts 3 and 4 currently have constructed-geometry coverage, not live-camera validation. A CPU worker detected both hands in the static two-hand fixture; warm worker calls on this PC were roughly 56–59 ms. The GPU path detected only one hand in that same image, which is why Finger grid uses CPU hand inference while Classic keeps GPU. This observation is not a general hardware benchmark.
- Existing Classic composition/UI/model initialization, learned movement writing with persistent teaching preview, and worker startup/fallback/restart/stop checks passed. Source syntax and all seven bundled vision checksums passed.
- No intended-user or live human finger-count accuracy has been measured for this environment. Hands must be visible and sufficiently clear; ambiguous geometry abstains. Synthetic browser inputs and public static images are not clinical validation.
