# Verification record

Software checked November 6, 2026 (Eastern). These are engineering checks, not clinical or human performance results.

- 13 automated logic tests passed: learned labels, rest/unknown rejection, overlapping gestures, neutral rearming, hold/debounce behavior, all alphabet letters via two controls, editing, confirmation, pause/resume, navigation, profile roundtrip, invalid data and validation accounting.
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
