import { Router } from "express";
import { prisma } from "../app";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { singleImage } from "../middleware/upload";
import { detectImage, saveImage, removeFile, resolveUpload } from "../lib/files";

export const photosRouter = Router();
photosRouter.use(requireAuth);

// Скільки годин живе фото для примірки (за замовчуванням 7 діб)
const TTL_HOURS = Number(process.env.PHOTO_TTL_HOURS) || 168;

// GET /photos: мої актуальні фото
photosRouter.get("/", async (req: AuthRequest, res) => {
  const photos = await prisma.userPhoto.findMany({
    where: { userId: req.userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true, expiresAt: true },
  });
  res.json(photos);
});

// POST /photos: завантажити фото для примірки
photosRouter.post("/", singleImage(10), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не передано" });
  const ext = detectImage(req.file.buffer);
  if (!ext) return res.status(415).json({ error: "Підтримуються лише JPG, PNG та WebP" });

  const storagePath = await saveImage("photos", req.file.buffer, ext);
  const photo = await prisma.userPhoto.create({
    data: {
      userId: req.userId!,
      storagePath,
      expiresAt: new Date(Date.now() + TTL_HOURS * 3600 * 1000),
    },
    select: { id: true, createdAt: true, expiresAt: true },
  });
  res.status(201).json(photo);
});

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

// GET /photos/:id/file: саме зображення. Лише власнику (потрібен токен)
photosRouter.get("/:id/file", async (req: AuthRequest, res) => {
  const id = parseId(req.params.id as string);
  if (id === null) return res.status(400).json({ error: "Невірний id" });
  const photo = await prisma.userPhoto.findFirst({ where: { id, userId: req.userId } });
  const full = photo && resolveUpload(photo.storagePath);
  if (!photo || !full) return res.status(404).json({ error: "Фото не знайдено" });
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.sendFile(full, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: "Файл не знайдено" });
  });
});

// DELETE /photos/:id
photosRouter.delete("/:id", async (req: AuthRequest, res) => {
  const id = parseId(req.params.id as string);
  if (id === null) return res.status(400).json({ error: "Невірний id" });
  const photo = await prisma.userPhoto.findFirst({ where: { id, userId: req.userId } });
  if (!photo) return res.status(404).json({ error: "Фото не знайдено" });
  await prisma.userPhoto.delete({ where: { id } });
  await removeFile(photo.storagePath);
  res.json({ ok: true });
});

// Видаляє фото, у яких вийшов термін (викликається періодично з index.ts)
export async function cleanupExpiredPhotos() {
  const expired = await prisma.userPhoto.findMany({ where: { expiresAt: { lte: new Date() } } });
  for (const p of expired) {
    await prisma.userPhoto.delete({ where: { id: p.id } }).catch(() => {});
    await removeFile(p.storagePath);
  }
  if (expired.length) console.log(`Видалено прострочених фото: ${expired.length}`);
}
