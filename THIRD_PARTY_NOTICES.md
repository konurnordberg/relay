# Third-party credits

Relay combines its own calibration, recognition, interaction, and Creator code with the following libraries, models, data, and prior work. Their licenses remain applicable independently of the application code.

| Component | Source and bundled notice |
| --- | --- |
| MediaPipe Tasks Vision 0.10.32 | [Google MediaPipe](https://github.com/google-ai-edge/mediapipe), Apache-2.0. [Bundled license](dist/vendor/LICENSE.txt); exact runtime and face/hand model sources are recorded in [assets-manifest.json](dist/assets-manifest.json). |
| ONNX Runtime Web 1.23.2 | [Microsoft ONNX Runtime](https://github.com/microsoft/onnxruntime/tree/v1.23.2), MIT. [License](dist/vendor/ort/LICENSE) and [third-party notices](dist/vendor/ort/ThirdPartyNotices.txt). |
| EMNIST Balanced handwriting model | [Shahriar Ahmed Seam](https://github.com/shahriar-ahmed-seam/HandwrittenCharacterRecognition), pinned revision `77fc94ad095997d6e766d7da947635320373b440`. Original weights, MIT; [license](dist/models/letters-LICENSE). |
| Flow vocabulary | Adapted from [Hermit Dave's FrequencyWords](https://github.com/hermitdave/FrequencyWords), English 2018, derived from OpenSubtitles. The adapted data is CC BY-SA 4.0; [attribution and changes](dist/data/FLOW_WORDS_NOTICE.md), [license](dist/data/CC-BY-SA-4.0.txt). |
| Development dependencies | Esbuild, Drizzle ORM, and Drizzle Kit are pinned through [package-lock.json](package-lock.json); their package notices apply. Optional browser tooling uses Playwright Core. |

The handwriting dataset itself is not bundled. [Model notices](dist/MODEL_NOTICES.md) distinguish the model author's license from the EMNIST dataset attribution and describe preprocessing and output classes.

Cirrin adapts the circular word-entry interaction introduced by Jennifer Mankoff and Gregory Abowd in 1998. [Original paper](https://sites.cc.gatech.edu/fce/pendragon/publications/cirrin98.pdf). Gesture access, switch scanning, personalized AAC, and swipe keyboards also have substantial prior work; Relay's contribution is its particular implementation of personal calibration and composable communication environments.

The repository screenshots show Relay's real interface in a fresh local preview with the camera off. Feed images depict the six bundled examples; they do not represent user adoption or recognition performance.

No open-source license has yet been selected for Relay's original application code. This notice preserves third-party attribution and does not relicense those components.
