# About Relay

Relay is a browser-based platform for creating and using communication interfaces controlled by movement. I built it for the Triangle AI Hackathon 2026, Computer Vision track.

The starting point was personal gesture control: learn what someone's rest looks like, record movements they can comfortably repeat, and turn those movements into useful actions. Two gestures can navigate a complete keyboard. One can select while the keyboard scans automatically. A person does not need to invent 26 gestures to write a sentence.

That became a larger idea: let people build the interface as well as teach the gestures. Relay's Creator separates the layout, input signals, and selection rules. Characters can become a grid, a freely arranged canvas, or a hand-turned ring. Drawing surfaces can recognize letters or personal symbols. A helper can build an environment for someone they know, test it, and install it in the same writing space.

The public environment feed makes these configurations shareable. Anyone can browse, try, and remix them. Signed-in creators can publish environments and vote on the ones they find useful. Sharing a layout does not share a person's face or hand calibration.

## What makes it work

MediaPipe provides face and hand landmarks. Relay's personal recognition layer compares calibrated examples, handles uncertainty, and waits for deliberate activation. A local ONNX model reads drawn letters; a separate geometric decoder recognizes paths through a word keyboard. Camera processing happens on the device, without a remote language model interpreting the person's intent.

The six starting environments are Classic, Finger grid, Air letters, Cirrin, Flow, and Chord. Each uses the same text editor, undo, and speech workflow. Creator exposes reusable components and compatible local models for further experiments.

## What has been demonstrated

In an early real-camera test, I typed “hi” using an eyebrow raise for Next and an open-mouth gesture for Select, then tested deletion, undo, and speech. Automated checks cover recognition logic, saved profiles, input gating, Creator behavior, and feed permissions.

Relay is a prototype. The next meaningful milestone is repeated-session testing and co-design with people who use alternative communication, measuring setup effort, correction rate, fatigue, and accidental activation. It is not yet a clinically validated aid or a proven replacement for every existing access method.

Built by **[Konur Nordberg](https://github.com/konurnordberg)**.

[Try Relay](https://relay-personal-voice.parlaygoat.chatgpt.site/) · [Read the code](README.md#where-to-look-in-the-code) · [Build an environment](CREATOR.md)
