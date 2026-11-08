# Changelog

Release notes describe behavior at the time of each release. Current setup, public access, and supported features are documented in [README.md](README.md).

## 2.3.2 — Consistent signal analyzer

Inside the recognizer now shows the same observed gesture as Current gesture beneath the camera. Hold/rest instructions still come from the action gate, so a recognized pose stays visible while waiting to rearm instead of being mislabeled uncertain. Recognition thresholds and action gating are unchanged.

The browser regression covers legacy face recordings and combined face/hand poses before rest, during hold, after selection lock, through unknown input and tracking loss, and when the camera stops. The analyzer remains non-writing.

## 2.3.1 — Deleted drafts stay deleted

Deleting the currently remembered Creator draft now clears the editor document, undo history, preview, and publication state after storage deletion succeeds. Returning from Home opens the library, and sign-in cannot save the deleted in-memory copy again. Deleting another draft or uninstalling a separate installed copy preserves the active draft.

The browser regression reproduces the original navigation sequence and checks blank/edited drafts, sign-in, stale return URLs, reload, independent uninstallation, and failed storage deletion.

## 2.3.0 — Public launch

Anyone can open Relay, use its local camera features, build environments, and browse, try, or remix the shared feed without an account. ChatGPT sign-in is required only to publish environments or vote. Sign-in and sign-out use the hosting platform's top-level redirects; creators return to their saved draft and must explicitly confirm publication.

Public publication explains which layout, output text, and custom sketch examples become downloadable. Personal profiles, calibration, message drafts, and camera video remain local. The six built-in examples are available for remix with attribution. Previously private user packages stay owner-only until explicitly republished with a public license. The former catalog-maintenance endpoint is removed.

Validation includes 135 unit tests, anonymous read/authenticated write checks, shared reversible votes across accounts, private-package isolation, safe sign-in return paths, and browser flows for guest browsing, saved-draft sign-in return, publication, voting, and sign-out. Browser authentication redirects are simulated locally; the actual public gateway is checked after access changes.

## 2.2.1 — Creator showcase

The Home page now presents all six editable environment templates together and explains how layouts, inputs, and selection rules can be combined in Creator space. This replaces the dial-specific example with a broader invitation to remix or start from a blank canvas.

## 2.2.0 — Home

Home now opens above Get started for new and returning visitors. It explains User space, Creator space, and the private Environment feed, with six selectable previews rendered from Relay's existing environment layouts. A component-built dial illustrates how layout, input mappings, and a selection rule work together.

Home links directly to setup, writing, the creator, and the feed. Saved profiles and drafts remain available through Continue writing. The camera stays off on arrival and stops when returning Home. The existing green and cream palette is preserved, with responsive layouts and keyboard-operable preview controls.

The home browser check covers all six previews, navigation, camera lifecycle, saved profiles/messages, and 320–1440px layouts including large text.

## 2.1.6 — Stable camera feedback

Finger grid and the shared camera renderer no longer overwrite the same tracking section. Persistent face/hand badges follow the active camera mode, update only when status changes, and tolerate brief display dropouts without changing gesture recognition. Performance details refresh once a second.

The browser regression reproduces the old alternating text/height bug and checks stable badge nodes, panel height, and Current gesture position for guests and saved profiles across all six built-in environments. The 130 unit tests and existing laptop/mobile finger-grid and saved-gesture checks pass.

## 2.1.5 — Creator interaction fixes

Arrangement choices survive editor redraws. Arrange defaults to the whole active group, with an explicit selected-only option. Numeric target and group edits update the visible canvas, target reach is shown, and its drag handle no longer blocks letters.

Camera preview is available on unfinished drafts without requiring a gesture profile. Status and missing setup appear next to the controls; only the active surface determines whether its camera selections run. Camera failure/retry, stopping, and navigation keep the preview control synchronized. Installation and publication still require a complete environment.

Validation: 130 unit tests, source/asset checks, the original Creator/drawing/feed/demo workflows, and new browser regressions pass. Real bundled vision startup was checked with Chrome’s simulated camera; gesture selection tests use controlled landmarks.

## 2.1.4 — Accurate previews and a blank-canvas demo

The feed, drafts, and installed cards render layout-specific SVG previews: Classic's scan keyboard, the numbered finger grid, handwriting ink, Cirrin paths, Flow's QWERTY keys, and Chord phrase cards. Custom layouts use their saved positions and group transforms. The shipped Rotate & hold dial is removed from the catalog and installed choices while user-created copies remain. [CREATOR.md](CREATOR.md) gives the tested component-by-component recording recipe for building it from scratch.

Validation: 130 unit tests pass; the thumbnail browser check verifies six distinct previews, mobile layout, catalog retirement, and construction through a controlled camera selection and installation.

## 2.1.3 — Environment feed catalog

The private feed includes seven existing environments, all credited to konurnordberg. Stable IDs prevent duplicates and preserve votes. The originals open in their existing user environments; remixes open as editable canvas components. Fixed catalog installation is a shared operation behind the owner-private Sites gateway and never overwrites user-owned records.

## 2.1.2 — Saved gestures and environment workspace

Legacy face recordings retain their original feature channel after migration. Completed gestures stay active when another gesture is unfinished, and Signal analyzer lists saved/ready counts with specific recording issues. The selected profile persists across refreshes. Classic separates camera state from gesture control and can start both together; physical editing temporarily pauses gesture control.

Environment cards replace the dropdown, highlight Classic as default and Finger grid as recommended, and show genuinely upvoted private-feed environments. Finger grid keeps counts, selection target, percentage and remaining hold time directly above the letters. Laptop layouts keep all 36 cells and the camera in view; mobile feedback stays pinned during scrolling.

## 2.1.1 — Demo controls

The message is directly editable with a physical keyboard in every environment. Clear is immediate and Undo restores it. Signal analyzer is in the main navigation, with nearest competing pose comparisons. Current gesture feedback remains beneath the camera, independently of whether a command is armed. All-signals profiles keep face and hand tracking active across environments.

## 2.1 — Composable canvas

Creator starts with **components, input mappings, and selection rules**, rather than environment-specific builders. Place individual choices and labels anywhere, group them, arrange or drag them, and bind signals to group rotation, movement, size, pointer coordinates, or selection indices. Nested groups and optional input-range conditions support combined behaviors without code.

A hand-turned wheel is now a composition: free letters + a group + a rotation mapping + a fixed target + dwell. The same primitives produce sliding strips, finger-indexed arrangements, and other interfaces. Circle/grid/line are one-time arrangement commands; every choice remains freely editable. Drawing surfaces retain selectable local recognition models. Existing version-1 environments still run and can be edited as version-2 component documents. The feed and app remain private.

See [CREATOR.md](CREATOR.md) for the build-from-scratch walkthrough and supported primitives.

## 2.0 — Creator space and private feed

Relay now separates **User space** from **Creator space**. Build communication environments with editable tables, dials, drawing pads, swipe keyboards and free layouts. Choose controls and compatible local models, train custom drawn symbols, preview separately, install, export, and remix. The new **Rotate & hold dial** uses hand orientation to turn a character dial and dwell to select.

The **Environment feed** stores explicitly published environment documents and one reversible upvote/downvote per signed-in account in the site's database. The app remains owner-private. Personal calibration and communication drafts remain local; published packages include layouts, output text, and any custom sketch examples. No camera video is uploaded.

See [CREATOR.md](CREATOR.md) for the exact build-from-scratch walkthrough, model choices, sharing rules, limits, and development commands. Original communication environments and profiles remain available. This is a configurable prototype, not a claim of unlimited interactions or clinically validated access.

## 1.8 — Simplified interface

The primary navigation is **Write & speak**, **Teach gestures**, **Check accuracy**, and **Settings**. Technical diagnostics are under **Advanced → Signal details**. Promotional headlines, illustrations and repeated subtitles have been removed; the existing cream and green palette is retained.

Returning users with a trained profile start in the writing workspace, with the camera still off. Setup presents rest, gestures and checking in order; completed rest is collapsed but can be rerecorded. Camera options, gesture instructions and personal vocabulary remain available in labeled disclosures. All six input methods, existing profiles, calibration, editing, speech confirmation and backups are preserved.

Controls are larger, text has stronger contrast, and **Settings → Text and controls → Large** persists on the device. Dialogs have accessible names, focus the form and restore focus on close. Recording announces phase changes instead of repeatedly replacing a live region; Escape cancels. The camera and cancellation control stay visible during mobile teaching. Reduced-motion preferences are respected.

`tests/interface-browser.mjs` checks keyboard dialogs, display persistence, all input layouts at 320–1440px with large text, pinned recording controls, phase announcements and accessible control labels. These are automated usability checks, not a claim of accessibility certification or user-study results.

## 1.7.1 — Teach hand symbols

Teaching and Classic recognition now use the CPU hand detector already used by the hand environments. Old face-only profiles automatically expand to face + both hands, preserving their identifiers, actions, examples and drafts. The pre-upgrade collection is backed up in this browser; prior accuracy records remain historical because the recognizer revision changes.

Held-pose recordings summarize each visible body part independently, retaining a channel with at least 75% coverage and three observations. Missing landmarks never become zero-valued training examples. A badly lost example produces a specific retry message. Hand shapes using the same channels train as competing classes; a learned two-hand combination takes precedence over a matching one-hand constituent. Unrelated simultaneous signals still abstain.

To add a hand symbol: enable the camera in **Teach gestures**, check the hand indicator is green, add a gesture with **Hold a pose**, then alternate a visible relaxed hand with your symbol when prompted. Keep the hand visible during the relaxed portion as well. The saved gesture shows **Learned: Left hand / Right hand / Face**. Existing face rest is sufficient to start; each new symbol also records its own relaxed examples. Retrain hand symbols whose old recordings discarded the hands.

Validation: unit regressions cover face-profile conversion, hand-only and two-hand classification, competing finger shapes, dropouts and rejection. `tests/hand-teaching-browser.mjs` exercises the complete five-example teaching flow, existing face gestures, camera writing and reload with controlled landmarks. Real bundled MediaPipe is separately checked on public hand photographs; these checks are not a measured user accuracy claim.

## 1.7 — Flow and a shared vision pen

**Flow** is continuous word entry on a QWERTY layout. Trace the letters of an arbitrary dictionary word in one movement; lift to decode and insert it. It uses 20,000 local word/frequency pairs, arc-length resampling, endpoint and path-distance scoring, and banded dynamic time warping in a dedicated worker. Personal vocabulary joins the candidate set. There is no sentence-shortcut lookup or LLM-generated message.

### Try Flow
1. Open Write & speak → **Flow · swipe words**. Start Flow input and allow the camera.
2. Keep the palm visible. With an open hand, move the cursor to the first letter. Extend the index finger and curl the other fingers, then trace through the word's letters. Open the hand to finish. Double letters need no extra loop.
3. Matched words insert on lift by default. Turn off **Insert matched words when I lift** for explicit review. Uncertain paths always wait for review; a thumbs-up or open-hand hover over a candidate chooses it.
4. To correct the latest inserted word, hover with an open hand over an alternative above the keys, or click it. Hover over bottom controls for Space, Undo, Delete, punctuation, case, or a mode change. A held control fires once until the pointer leaves it.
5. **Spell**, **Symbols**, and **More symbols** support unfamiliar names, all printable ASCII, newline and tab. Point at a key, then lift to insert one literal character. The clickable key fallback is also available.
6. Under **Positioning & writing preferences**, choose a comfortable movement range. Hold the fingertip near the middle of your comfortable workspace and select **Center on my finger**.
7. **Compare with your keyboard** times identical ordinary-text targets, includes corrections, and ends on an exact match. Camera trials disable pointer text entry; keyboard trials block paste/drop. Export results before closing the browser.

This version composes text inside Relay. Copy moves it into another application; it does not install a system-wide keyboard driver. It is intended for stationary use, not texting while driving. Faster-than-keyboard performance is an evaluation goal, not an achieved claim.

### More robust Air letters and Cirrin
All three drawing environments now share **VisionPen**. The default is **point to draw / open hand to lift**, keeping the thumb away from the index tip. Optional thumb–middle pinch keeps the index extended; thumb–index pinch remains available for comparison. Pen settings persist in profiles and guest preferences.

The controller buffers stroke starts, excludes opening-hand motion from the endpoint, preserves short gaps up to 240 ms without inventing samples, rejects stale frames, tracks the nearest previous hand when detection order changes, and requires a reset after longer loss. Peripheral cropping does not discard an otherwise visible pointer and palm. Air ink retains short-gap continuity and uses smooth display curves. Cirrin registers inward-to-outward sector crossings without a per-letter dwell, tolerates moderate radial overshoot, and retains explicit word confirmation. Air letters and Cirrin now use the same local CPU two-hand worker as Flow; personalized Classic processing is unchanged.

### Evidence and limits
The new default pen passed controlled-hand browser tests through actual neural H recognition and fast HELLO ring spelling, including multiple strokes, brief gaps, and pen-up repositioning. The bundled MediaPipe model recognizes point/open poses in public static-image fixtures. Legacy pinch still passes its letter/ring checks.

A fixed 200-word sample from the vocabulary, rendered as constructed paths with sinusoidal noise, produced 194 first choices and 200 top-three matches in the development smoke test. At 12 observations per constructed word, the sparse-path decoder returned 191 first choices and 200 top-three matches on the same sample; at 18 observations it returned 192 and 200. This is not live-user accuracy, a speed benchmark, or independent validation. Rapid queued word requests, late-result cancellation, profile import checks, camera-only corrections and full character coverage have automated checks. Physical movement, blur, occlusion, hardware and vocabulary ambiguity still require live evaluation.

Run node tests/flow.test.mjs, node tests/flow-decoder.mjs, node tests/flow-browser.mjs and node tests/point-writing-browser.mjs. Decoder tests do not supply their target sentence to the recognizer. Existing Air/Cirrin browser tests explicitly exercise legacy pinch; the new point-writing test covers the default.

Vocabulary attribution and the CC BY-SA 4.0 license are in dist/data/FLOW_WORDS_NOTICE.md and dist/data/CC-BY-SA-4.0.txt. The adapted vocabulary is under that license. The gesture-decoding design draws on [SHARK², Kristensson and Zhai (2004)](https://www.pokristensson.com/pubs/KristenssonZhaiUIST2004.pdf); no code or measured performance is copied from that work.

## 1.6 — Chord speed writing

Chord uses gesture shorthand to insert whole words or reusable text blocks. The speed hypothesis is **more text per deliberate action**, inspired by chorded input such as [Open Steno](https://www.openstenoproject.org/), not faster letter-by-letter finger tracing.

1. Open **Write & speak → Chord · speed writing → Start Chord input**. No calibration or paid API is needed.
2. Keep both whole hands visible on opposite sides of the mirrored preview. Close both fists to begin.
3. The hand on the preview's left chooses **bank 0–5**. Keep the other hand closed while browsing. Raise **1–5 fingers** on that other hand to choose a slot.
4. The selected text turns green after a short stable hold. **Close both fists to send it.** Intermediate finger counts while closing cannot change the armed choice. To cancel an armed choice, lower one hand for at least 0.3 seconds, then show both fists again.
5. Twenty editable shortcuts keep fixed codes; edit one to contain a frequently used phrase or code snippet. **Insert exactly** preserves whitespace for code. Word palette offers local next-word choices and five ambiguous prefix groups in bank 3; Spell and Symbols reach the full printable ASCII set.
6. **Race your keyboard** compares the same target with keyboard and camera input. The reusable-phrase scenario uses the starter codebook during the timed trial (0·1, 0·3, 1·3), even if personal shortcuts have been edited. The word scenario requires word selection/spelling. Practice first. Export the comparison to preserve session results.

Each trial starts explicitly, ends only on an exact target match (trailing whitespace allowed), and includes correction time. WPM is target characters / 5 / elapsed minutes. Keyboard paste/drop and pointer text entry during camera trials are blocked. Separate trial drafts protect the regular message. Results are the most recent trial per method/scenario, not population averages. Exported results are a local practice log, not tamper-proof evidence.

**We have not established that Chord beats a physical keyboard on novel prose.** Reusable phrase throughput measures text expansion, which also has keyboard-based alternatives. Learning time, camera latency, correction rate, fatigue and live recognition require user testing. No language model writes or guesses sentences for the user.

Chord runs one local two-hand MediaPipe worker on CPU; no face model is loaded. Its release gate requires fresh frames and cancels on loss or staleness. Timing is configurable at 120/180/260 ms. Existing environments retain their camera settings. Shortcuts persist per profile (and in profile backups), or in a separate guest store. No video or landmark stream is saved.

Validation: node tests/chord.test.mjs covers all 30 codes, cancellation, stale frames, text/undo, full ASCII, profile validation and timing math. node tests/chord-browser.mjs exercises controlled hand landmarks through phrases, word composition, editable literal snippets, benchmark isolation, mobile layout and persistence. node tests/chord-camera.mjs checks worker setup, startup/runtime fallback and real bundled MediaPipe initialization. These automated inputs are not live-user speed or accuracy measurements.

## 1.5: Cirrin ring

A fourth communication environment follows the word-level circular keyboard interaction introduced by Jennifer Mankoff and Gregory Abowd in 1998: https://sites.cc.gatech.edu/fce/pendragon/publications/cirrin98.pdf

Relay uses an alphabetical A–Z ring, a webcam pinch as pen-down, visible word paths, and explicit review. Pinch in the center, visit each letter tile, travel through the center to skip unwanted letters, and release to review. Return inward before revisiting a letter to spell doubles. Hold thumbs-up to insert the exact spelling with a trailing space, or choose a displayed word button. One Undo removes the inserted word. Mouse/touch dragging and letter buttons also work.

The HELLO guide labels a practice route. Movement range and Center on my finger adapt the dial to the drawing hand. Letter boundaries use a dead zone and fresh-frame stability; tracking loss interrupts a draft and never inserts text. Optional nearby-word suggestions use a small local vocabulary plus personal words. Literal spelling always remains available, including words absent from the vocabulary. Cirrin's decoder uses spatial letter visits, not the Air letters handwriting model. No new model download or API is required.

Run node tests/cirrin-browser.mjs for controlled fingertip/pointer word input, doubled letters, confirmation, spacing, undo, speech, responsive camera docking, and persistence. Core tests are included in npm test. These checks do not measure real-user speed or accuracy.

## 1.4

- **Air letters environment:** index-tip trajectories become multi-stroke ink. Pinch thumb/index to draw, release to reposition, pause for three handwriting-model suggestions, and hold thumbs-up for 850 ms to insert the first choice (or click any choice). Mouse/touch drawing and correction buttons are available. No letter is automatically inserted.
- **Local neural inference:** an MIT-licensed EMNIST Balanced CNN runs in a dedicated ONNX Runtime Web worker. Upright, aspect-preserving, centered 28×28 rasters at three stroke widths are averaged. Lower/uppercase classes are combined; digit lookalikes remain visibly ambiguous. No API key, video upload, or training is needed for this environment.
- **More tolerant finger counts:** image-plane and 3D evidence combine tip reach, overall extension, bends and thumb separation. A single bent/noisy joint no longer vetoes a whole hand. Fresh-frame stability and short uncertainty pauses reduce flicker without allowing uncertain frames to select a cell.
- **Shared workspace:** Classic, Finger grid and Air letters share message text, undo, speech confirmation and saved drafts. Switching environments stops active input.
- **Limits:** air writing is one printed A–Z letter at a time, not cursive word recognition. Constructed trace/geometry checks are not evidence of accuracy on people; real-camera testing remains necessary.

### Try Air letters
Write & speak → Environment: Air letters → Start air writing. Keep one full hand in view. Touch thumb and index fingertips and move the index tip to draw. Separate them to lift the pen; pinch again for another stroke. After a roughly one-second pause, review the choices. Hold a thumbs-up to insert the first, or click the desired letter. Space, punctuation, Delete, Undo and case are below the pad. The camera stays visible while scrolling.

### Additional checks
Run node tests/letter-model.mjs for the actual bundled neural model on 26 constructed paths at two jitter levels (52 checks; not human accuracy). Run node tests/air-browser.mjs for tracked pinch paths through actual inference, deliberate insertion, editing, confirmation, environment switching and desktop/mobile camera visibility. Run node tests/finger-vision.mjs for actual MediaPipe inference on public hand photos, and node tests/finger-environment.mjs for coordinate typing. Model provenance and exact licenses are in dist/MODEL_NOTICES.md.

## 1.3.0 — November 7, 2026
- Added saved communication environments: Classic keyboard (default) and Finger grid, sharing composition, undo, phrases and speech.
- Added 0–5 finger counts for row/column selection on a labeled 6×6 keyboard, live preview, adjustable holds and hand-role swapping.
- Added stable bottom-row editing/page controls and separate letters, numbers, symbols, phrases and tools pages, with explicit speak/clear confirmation.
- Added repeat suppression, uncertainty/loss rejection, raw-frame freshness checks, and isolation from learned Classic gestures.
- Kept camera and recent message visible in the narrow-screen finger workspace without covering grid cells.
- Preserved profile calibration and restored its camera mode when leaving the finger environment; selected a CPU hand worker for verified two-hand fixture detection.
- Added geometry, all-coordinate, character-reachability, browser and real-model fixture coverage.

## 1.2.4 — November 7, 2026
- Let learned text movements and poses write without Select or Next; direct-only profiles no longer run an idle keyboard scan.
- Add a Teach a writing movement shortcut with Movement and Insert text preselected, visible text mappings and last-written feedback.
- Keep a larger teaching camera and the current instructions together while scrolling; add a compact fixed camera/instruction dock on narrow screens.
- Mirror phase progress and cancellation beside the camera, preserving saved profiles, motion recognition and existing keyboard controls.

## 1.2.3 — November 7, 2026
- Separated face and hand inference into local workers; newest-frame scheduling avoids a processing backlog and leaves canvas rendering independent.
- Request up to 60 fps, prioritize hand cadence, tolerate fast tracking-box movement, and fall back when workers are unavailable or fail.
- Keep coherent fast palm/fingertip motion and sharp reversals connected; bridge plausible visual gaps up to 320 ms while retaining spike/remote-jump rejection.
- Batch glow rendering and display measured camera and hand/face FPS.
- Preserve profile schema, local-only processing, stale-frame expiry and recognition isolation from repaired trails.
- Add fast-motion, scheduling, stale-session, stop/restart and fallback regressions.

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
