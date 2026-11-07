# Relay
**Your movement. Your words.**

Relay is a camera-based communication prototype that helps people with limited speech or mobility turn movements they control into written and spoken words. Using an ordinary webcam, it learns personal gestures and offers multiple ways to compose a message—all processed on the user's device.

Built for the **Triangle AI Hackathon 2026 · Computer Vision track**.

## Inspiration

People have different abilities, comfortable movements, and levels of control. A raised eyebrow might be reliable for one person; a hand movement might work better for another. Those abilities can also change with fatigue or over time.

Relay starts with a simple idea: **communication tools should adapt to the person using them.** Our goal is to make personalized communication possible with hardware people already have.

## What it does

Relay organizes communication into interchangeable **environments**, each sharing the same message, editing controls, and speech output.

### Classic keyboard: your own gesture vocabulary

Users first record their natural resting state, then teach Relay comfortable facial expressions, hand poses, or short movements. Each signal can navigate the keyboard, select a letter, insert a phrase, delete, undo, or request speech.

Two gestures can navigate and select across a full keyboard. One reliable selection gesture can work with automatic scanning. Users do not need a separate gesture for every letter.

### Finger grid: two hands, one coordinate

One hand chooses a row and the other chooses a column by showing zero to five fingers. A 6 × 6 grid provides 36 positions per page, with additional pages for letters, numbers, symbols, and personal phrases.

The counter combines image-plane and 3D hand measurements with temporal stability checks. Selection requires a deliberate hold, and repeated input requires a change or release.

### Air letters: handwriting without a surface

Users pinch their thumb and index finger together and move their fingertip to trace a letter. Releasing the pinch lifts the pen, allowing letters with multiple strokes.

A local neural handwriting model reads the drawing and presents three suggestions. Users confirm the first with a thumbs-up or choose another letter. Persistent neon ink makes the captured movement visible on both the drawing pad and camera preview.

### Cirrin ring: a continuous stroke for a word

An alphabetical ring lets users spell words by visiting letter tiles in one continuous pinched-finger stroke. The open center provides room to move between letters. Users release to review the captured spelling and confirm with a thumbs-up or a word button. A practice route, adjustable movement range, and optional local vocabulary suggestions support learning and correction.

This environment adapts the [Cirrin interaction introduced by Jennifer Mankoff and Gregory Abowd in 1998](https://sites.cc.gatech.edu/fce/pendragon/publications/cirrin98.pdf) to Relay's webcam controls. It shares the same message, undo history, and speech output as the other environments.

### Chord: gesture shorthand for everyday productivity

Chord explores a broader use for Relay: typing chunks instead of individual characters. One hand browses six banks; the other selects one of five slots. A brief stable pose arms the text, and closing both fists sends it. Twenty fixed shortcuts can contain personal phrases or whitespace-preserving code snippets; a local word palette and spelling pages handle other text.

A built-in keyboard/camera comparison uses the same target and includes correction time. Reusable phrase results measure text expansion, not general prose speed. The interface is implemented and covered by controlled-input tests; faster-than-keyboard performance has not yet been demonstrated by a live user.

## How we built it

- **MediaPipe Tasks Vision** locates facial features and hand landmarks from webcam frames.
- **Personal gesture learning** uses calibrated examples, selected features, and temporal matching to recognize held poses and short movements.
- **ONNX Runtime Web** runs a pretrained EMNIST handwriting classifier locally. Relay normalizes each drawing and combines predictions from three stroke widths.
- **Web Workers** keep vision and handwriting inference separate from the interface.
- **JavaScript, HTML, and CSS** power the browser application, with local profile and draft storage.
- **Browser speech synthesis** reads confirmed messages using an installed local voice.

Camera frames are processed on the device. Personal gesture profiles remain in the browser and can be exported for backup. Model attribution and licenses are documented in [Model notices](dist/MODEL_NOTICES.md).

## The hardest parts

**Separating intention from ordinary movement.** Rest calibration, activation timing, uncertainty handling, and release requirements help prevent casual motion from becoming unwanted text.

**Tracking motion without losing responsiveness.** Independent vision workers and bounded frame processing keep the interface responsive while following moving hands.

**Making recognition understandable.** Visible ink, finger-count readouts, editable letter suggestions, and a persistent camera preview help users see what Relay detected and correct mistakes.

## What we have demonstrated

In an initial live-camera test, a user wrote **“hi” using an eyebrow raise for Next and an open-mouth gesture for Select**, and reported that delete, undo, and speech worked.

Automated checks cover gesture recognition, coordinate typing, editing, confirmation, profile persistence, and responsive layouts. The handwriting model also correctly ranked all 26 constructed uppercase letter paths at two jitter levels in a 52-case smoke test.

These results demonstrate prototype functionality. They do not establish recognition accuracy across people or clinical effectiveness. Performance still depends on the user's movements, camera, lighting, and positioning.

## What's next

- Co-design and test with people with varied communication and mobility needs.
- Measure communication speed, correction rate, fatigue, and accidental activations.
- Improve recognition using consented real-world feedback and optional personal adaptation.
- Refine the circular writing interface and develop additional communication environments with user feedback.
- Make setup, recovery, and daily use easier for users and support partners.

**The vision: a communication interface built around the movements a person can make and the words they choose to say.**

[Open the private prototype](https://relay-personal-voice.parlaygoat.chatgpt.site/)
