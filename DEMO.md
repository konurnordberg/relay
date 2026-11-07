# Relay — demo and submission kit

## Pitch
“Most interfaces ask you to adapt to their controls. Relay lets you teach the computer the movements you can comfortably repeat. It learns your rest, learns your personal signals, and gives you an entire alphabet from just one or two gestures.”

Avoid claiming universal access, clinical reliability, first-ever personalized gesture control, or thought-speed typing.

## Three-minute live demonstration
- 0:00–0:20: Explain the communication problem and the one/two-signal keyboard.
- 0:20–1:15: Open a fresh profile. Show resting capture and one new personal signal. Explain that each gesture has five separate examples. Use a saved, genuinely calibrated profile for the remaining demo if time is short; clearly identify the switch.
- 1:15–2:05: Activate camera input. Write a short unprepared word or phrase. Delete a character, restore it with Undo, then confirm speech.
- 2:05–2:30: Open Signal studio and show how rest, a learned signal, and an unfamiliar movement lead to different decisions. Show the fresh-attempt breakdown.
- 2:30–3:00: Show a different profile / input family if it has been validated. Finish with the next step: co-design and test with AAC users and practitioners.

A fresh full rest + two-gesture calibration takes roughly 85 seconds plus setup. Rehearse against the actual pitch time; do not pretend a preloaded profile is freshly trained.

## Your remaining real-camera rehearsal
1. Open localhost:4173 in Chrome or Edge. Use a stable camera at face height, even lighting, and a plain background.
2. Face/head is the first input to try. Choose two distinct movements that are comfortable and observable. A deliberate eyebrow raise and a brief open-mouth pose are example candidates, not required gestures. Avoid ordinary blinks as an initial command.
3. Calibrate rest and both gestures, then test each on new attempts. If they overlap, replace one.
4. Adjust hold time only after observing misses or accidental selections; rerun checks after timing changes.
5. Record at least 40 fresh attempts per profile and a five-minute natural-rest check. Aim for 95% correct, with no accidental selection in that rest check. These are targets, not achieved claims.
6. Write an original short sentence, demonstrate correction, speak, export, reload, and repeat three times.
7. Record a 60–90 second backup video of the actual camera demo. Do not use the synthetic integration test as performance evidence.
8. Bring the local folder and exported profile. Disconnect Wi-Fi once to confirm the models and system voice work locally.

If recognition is inconsistent, narrow to the best-performing profile and fewer gestures. If face/head fails, try the hand profile. Do not label head tracking as eye tracking.

## Submission draft
**Name:** Relay — Your movement. Your words.
**Track:** Computer Vision
**What it does:** Learns a person's resting behavior and chosen held movements from a webcam, then maps those personal signals to a complete keyboard and confirmed text-to-speech. One reliable signal supports automatic scanning; two support user-directed next/select.
**What we built:** Guided calibration; a per-user exemplar recognizer with learned feature weights and uncertainty rejection; a temporal gate preventing repeated activations; accessible text composition; local profiles; independent attempt and rest-check reports.
**AI contribution:** MediaPipe supplies pretrained visual landmarks. Our personal recognition layer learns the user's vocabulary. No language model decides what the user wants to say.
**Impact:** A prototype for lowering the hardware and customization burden of alternative communication access.
**Differentiation:** Make personalized training, ambiguity feedback, and repeatable validation part of one accessible workflow on an ordinary computer.
**Evidence:** Add your actual camera results and sample count here. Automated software tests do not establish human recognition accuracy.
**Limitations:** Brief held movements in supported modalities; coarse eye features experimental; no clinical evaluation or universal accessibility claim.
**Next:** Co-design with AAC users, accessible self-calibration, robust session adaptation, and evaluation across changing real-world conditions.

## Before submission
- Confirm current Devpost requirements, judging duration, and earlier of posted deadlines.
- Source repository / ZIP, live URL or local launch instructions, README and architecture.
- Real demo video and exported validation report.
- Library/model attribution and honest prior-art comparison.
- Public access must be explicitly enabled if using the private hosted preview as a judge link.

## Stronger 1.1 demonstration
Prepare one personal word (such as your name) and one phrase that you authored in My vocabulary. Spell the first two letters and explicitly select the suggested completion. Switch to My phrases through the gesture keyboard. Use Focus view for readability. Show that the draft survives a reload. Explain that the model’s visible separation diagnostic is different from actual held-out test results; show both if you have measured them.

The credible closing line: “Our next milestone is showing that intended users can set this up, communicate comfortably, and return to it tomorrow. We’ve built the calibration, recovery, and measurement loop to test that.”
