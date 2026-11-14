#!/bin/sh
# へんしん（かおカメラ）の MediaPipe Face Landmarker を assets/face/ に おく。
# 使い方: sh tools/make-face.sh   （npm と curl が いる）
set -e
VER=0.10.14
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/face"
TMP=$(mktemp -d)
cd "$TMP"
npm pack "@mediapipe/tasks-vision@$VER" >/dev/null
tar xzf mediapipe-tasks-vision-$VER.tgz
mkdir -p "$OUT"
# CommonJS 版を ふつうの <script> で よめるように つつむ（file:// でも うごく。window.MPVision に でる）
{ printf '/* @mediapipe/tasks-vision %s (Apache-2.0) */\n(function(){var exports={};\n' "$VER"
  grep -v '^//# sourceMappingURL' package/vision_bundle.cjs
  printf '\nwindow.MPVision=exports;})();\n'; } > "$OUT/vision.js"
cp package/wasm/vision_wasm_internal.js package/wasm/vision_wasm_internal.wasm "$OUT/"
sed -i '/^\/\/# sourceMappingURL/d' "$OUT/vision_wasm_internal.js"
curl -sSfL -o "$OUT/face_landmarker.task" https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
curl -sSfL -o "$OUT/LICENSE" https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/LICENSE || true
rm -rf "$TMP"
ls -la "$OUT"
