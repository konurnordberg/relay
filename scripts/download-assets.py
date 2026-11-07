"""Fetch pinned public MediaPipe assets. No credentials or paid services."""
from pathlib import Path
import urllib.request, hashlib, json
ROOT = Path(__file__).resolve().parents[1] / "dist"
VERSION = "0.10.32"
BASE = f"https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@{VERSION}"
FILES = {
 "vendor/vision_bundle.mjs": f"{BASE}/vision_bundle.mjs",
 "vendor/wasm/vision_wasm_internal.js": f"{BASE}/wasm/vision_wasm_internal.js",
 "vendor/wasm/vision_wasm_internal.wasm": f"{BASE}/wasm/vision_wasm_internal.wasm",
 "vendor/wasm/vision_wasm_nosimd_internal.js": f"{BASE}/wasm/vision_wasm_nosimd_internal.js",
 "vendor/wasm/vision_wasm_nosimd_internal.wasm": f"{BASE}/wasm/vision_wasm_nosimd_internal.wasm",
 "models/face_landmarker.task": "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
 "models/hand_landmarker.task": "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
}
manifest = {}
for name, url in FILES.items():
    dest = ROOT / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if not dest.exists():
        print("Downloading", name, flush=True)
        with urllib.request.urlopen(url, timeout=90) as response:
            data = response.read()
        if len(data) < 1000:
            raise ValueError(f"Unexpected small asset: {name}")
        dest.write_bytes(data)
    data = dest.read_bytes()
    manifest[name] = {"url": url, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
(ROOT / "assets-manifest.json").write_text(json.dumps(manifest, indent=2))
print("Assets ready:", sum(x["bytes"] for x in manifest.values()), "bytes", flush=True)
