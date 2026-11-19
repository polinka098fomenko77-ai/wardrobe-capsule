#!/usr/bin/env bash
# Готує файли MediaPipe для камери: wasm з node_modules + модель обличчя від Google.
set -euo pipefail
cd "$(dirname "$0")/../frontend"
npm install
mkdir -p public/mediapipe/wasm
cp node_modules/@mediapipe/tasks-vision/wasm/* public/mediapipe/wasm/
if [ ! -s public/mediapipe/face_landmarker.task ]; then
  curl -L --fail -o public/mediapipe/face_landmarker.task \
    https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
fi
ls -lh public/mediapipe public/mediapipe/wasm
echo "Готово. Перезапустіть npm run dev у frontend."
