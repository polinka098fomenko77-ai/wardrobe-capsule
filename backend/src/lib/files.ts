import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// Папка для файлів. Її можна змінити через UPLOAD_DIR у .env
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "uploads");

export type ImageExt = "jpg" | "png" | "webp";

// Визначаємо справжній тип файлу за його першими байтами (а не за назвою чи заголовком)
export function detectImage(buf: Buffer): ImageExt | null {
  if (buf.length > 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
    if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  }
  return null;
}

// Зберігає файл під випадковою назвою. Повертає відносний шлях, наприклад "avatars/ab12.jpg"
export async function saveImage(subdir: "avatars" | "photos", buf: Buffer, ext: ImageExt): Promise<string> {
  const dir = path.join(UPLOAD_DIR, subdir);
  await fs.mkdir(dir, { recursive: true });
  const name = crypto.randomBytes(16).toString("hex") + "." + ext;
  await fs.writeFile(path.join(dir, name), buf);
  return `${subdir}/${name}`;
}

// Повертає абсолютний шлях, лише якщо він усередині папки uploads (захист від ../)
export function resolveUpload(rel: string): string | null {
  const full = path.resolve(UPLOAD_DIR, rel);
  return full.startsWith(UPLOAD_DIR + path.sep) ? full : null;
}

export async function removeFile(rel: string | null | undefined) {
  if (!rel) return;
  const full = resolveUpload(rel);
  if (!full) return;
  await fs.unlink(full).catch(() => {});
}
