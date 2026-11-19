import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

// Файли MediaPipe лежать у frontend/public/mediapipe (їх готує scripts/setup-camera.sh)
const WASM_DIR = "/mediapipe/wasm";
const MODEL = "/mediapipe/face_landmarker.task";

let landmarker: Promise<FaceLandmarker> | undefined;

export function loadFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarker) {
    landmarker = FilesetResolver.forVisionTasks(WASM_DIR).then((fileset) =>
      FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL },
        runningMode: "VIDEO",
        numFaces: 1,
      }),
    );
    landmarker.catch(() => {
      landmarker = undefined; // дозволяє спробувати ще раз
    });
  }
  return landmarker;
}

export type FaceState = {
  found: boolean;
  centered: boolean;
  size: "ok" | "far" | "near";
  yaw: "straight" | "left" | "right"; // у що треба повернути голову
};

type Point = { x: number; y: number };

// Аналізує 478 точок обличчя. Координати нормовані (0..1) відносно кадру
export function analyzeFace(lm: Point[] | undefined): FaceState {
  if (!lm || lm.length < 455) return { found: false, centered: false, size: "ok", yaw: "straight" };
  const nose = lm[1];
  const edgeA = lm[234]; // край обличчя з одного боку
  const edgeB = lm[454]; // з іншого
  const width = Math.abs(edgeB.x - edgeA.x);
  const midX = (edgeA.x + edgeB.x) / 2;
  const ratio = width > 0 ? (nose.x - midX) / width : 0; // 0 = дивиться прямо
  const centered = midX > 0.3 && midX < 0.7;
  const size = width < 0.18 ? "far" : width > 0.5 ? "near" : "ok";
  // Знімок дзеркальний як у дзеркалі, тож якщо ніс зміщений вправо в «сирому» кадрі,
  // користувач повернув голову ліворуч і треба повернути її праворуч
  const yaw = ratio > 0.12 ? "right" : ratio < -0.12 ? "left" : "straight";
  return { found: true, centered, size, yaw };
}

// Середня яскравість кадру (0..255) за зменшеною копією
export function averageBrightness(video: HTMLVideoElement, scratch: HTMLCanvasElement): number {
  const w = 64;
  const h = 48;
  scratch.width = w;
  scratch.height = h;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 128;
  ctx.drawImage(video, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return sum / (d.length / 4);
}

// Підсвічує темний кадр гамма-корекцією, щоб слабке світло не заважало примірці
export function normalizeBrightness(canvas: HTMLCanvasElement, mean: number, target = 125): boolean {
  if (mean >= 90 || mean < 1) return false;
  const gamma = Math.max(0.45, Math.log(target / 255) / Math.log(mean / 255));
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) lut[i] = Math.round(255 * Math.pow(i / 255, gamma));
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
  ctx.putImageData(img, 0, 0);
  return true;
}
