# Demo walkthrough

A good Relay demo shows a complete communication loop, then shows that the interface itself can change.

## Before recording

- Open the app on the laptop and camera you will use. Check lighting, framing, and browser camera permission.
- Keep a working, personally calibrated profile ready. Verify each gesture on fresh attempts.
- Rehearse a short original message, Delete, Undo, and speech. Check the system volume and selected voice.
- Export the profile and a Creator environment as backups. Keep a short recording of a successful real-camera run.
- Rehearse any hand-controlled environment before including it live. Use comfortable targets and hold times rather than chasing speed.

## Three-minute route

| Time | Show | Explain |
| --- | --- | --- |
| 0:00–0:20 | Home, then User space | Relay adapts communication interfaces to the movements a person can make. |
| 0:20–1:05 | A calibrated Classic profile writing a short message | Rest and personal signals become Next and Select. State when the profile was prepared. |
| 1:05–1:20 | Delete, Undo, then speech | Communication includes correction and control over what is spoken. |
| 1:20–1:40 | Finger grid or another rehearsed environment | Different movement abilities can use different interfaces while keeping the same message. |
| 1:40–2:30 | Creator: build or edit Palm Writer | Choices, a group, rotation mapping, target, and hold rule compose a new interface. |
| 2:30–2:50 | Environment feed and Remix | People can share layouts without sharing personal camera calibration. |
| 2:50–3:00 | The working environment | The next step is co-design and testing with intended users. |

The full blank-canvas recipe is in [CREATOR.md](CREATOR.md). A fresh complete calibration takes longer than a short pitch slot; use a clearly identified saved profile when needed.

## Useful technical explanations

- MediaPipe detects landmarks. Relay learns the user's examples and gates actions; it does not train a vision model from scratch.
- Camera inference runs locally. Published environment documents and votes use the server.
- Drawn letters use a local neural classifier. Flow uses geometric word-path matching. Neither depends on a remote LLM.
- Creator packages are validated configuration, with supported signals and rules, rather than arbitrary uploaded code.

## Feed access

The live app is public. Anyone can browse, try, or remix. ChatGPT sign-in is required to publish and vote. Publishing shares the layout, output text, and custom sketch examples, so use a package you intend to make public.

## Evidence to keep separate

Show actual camera use as actual camera use. Controlled browser fixtures establish software behavior, not accuracy across people. Phrase shortcuts measure expansion, not unrestricted typing speed. There is no established clinical effectiveness or universal-access claim.

For the submission, include the live URL, repository, real demo video, attribution, and the most relevant limitations. Add measured outcomes only when you have recorded the attempts and conditions behind them.
