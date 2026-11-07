# Bundled handwriting model and runtime

## EMNIST Balanced CNN
Author: Shahriar Ahmed Seam. Repository: https://github.com/shahriar-ahmed-seam/HandwrittenCharacterRecognition
Pinned revision: 77fc94ad095997d6e766d7da947635320373b440
Source artifact: models/char_model.onnx; bundled as models/letters.onnx (3,532,861 bytes).
Model license: MIT. Full original copyright and permission notice: models/letters-LICENSE.
The original ONNX weights are unmodified. Relay's rasterization, case aggregation and review UI are application code.
Input float32 [N,28,28,1], upright white ink on black, [0,1]. Outputs are 47 softmax classes:
0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabdefghnqrt
A three-width raster ensemble is averaged; letter-case scores are summed. Digit lookalikes are offered with explicit ambiguity, never silently inserted.
The model is trained on scanned handwritten characters. No air-writing accuracy claim is made.

## Training-dataset attribution
EMNIST: Gregory Cohen, Saeed Afshar, Jonathan Tapson and André van Schaik, “EMNIST: an extension of MNIST to handwritten letters,” 2017.
https://doi.org/10.1109/IJCNN.2017.7966217
Official information: https://www.nist.gov/itl/products-and-services/emnist-dataset
University dataset record lists Creative Commons Attribution-NoDerivatives 4.0 and Copyright Western Sydney University:
https://research-data.westernsydney.edu.au/published/2d9cc060519411ecb15399911543e199/
The dataset itself is not bundled. The dataset license is distinct from the model author's MIT license.

## ONNX Runtime Web
Microsoft ONNX Runtime Web 1.23.2, MIT.
Original license and third-party notices: vendor/ort/LICENSE, vendor/ort/ThirdPartyNotices.txt.
Downloaded from the pinned npm release. WASM backend, one thread, local dedicated worker.
https://github.com/microsoft/onnxruntime/tree/v1.23.2

The SHA-256 hashes of bundled model/runtime binaries are recorded in assets-manifest.json and checked by scripts/check.mjs.
Existing MediaPipe runtime license: vendor/LICENSE.txt. Existing MediaPipe model provenance remains in the repository documentation.

## Flow word vocabulary and decoder
The local word-frequency data in data/flow-words.json is adapted from Hermit Dave's FrequencyWords English 2018 list, based on OpenSubtitles 2018. It retains 20,000 lowercase English tokens with optional internal apostrophes.
Source: https://github.com/hermitdave/FrequencyWords/blob/master/content/2018/en/en_50k.txt
Content license: CC BY-SA 4.0; see data/FLOW_WORDS_NOTICE.md and data/CC-BY-SA-4.0.txt. The adapted vocabulary is distributed under that license.
Relay's path decoder is original application code using resampling, endpoint scoring and dynamic time warping. It is not a pretrained language model. No word-gesture training recordings are included.
