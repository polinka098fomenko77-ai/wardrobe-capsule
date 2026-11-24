import { Router } from "express";
import { z } from "zod";
import { prisma } from "../app";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { resolveUpload } from "../lib/files";
import { processTryOn } from "../tryon/process";
import { getProviderName } from "../tryon/provider";

export const tryonsRouter = Router();
tryonsRouter.use(requireAuth);

const createSchema = z.object({
  photoId: z.number().int().positive(),
  itemId: z.number().int().positive(),
});
const idSchema = z.coerce.number().int().positive();

// Якщо примірка «зависла» (наприклад, сервер перезапустили), через 10 хвилин вважаємо її невдалою
const STUCK_MS = 10 * 60 * 1000;

type Job = Awaited<ReturnType<typeof prisma.tryOn.findFirst>>;

function view(t: NonNullable<Job>) {
  return {
    id: t.id,
    status: t.status,
    errorText: t.errorText,
    hasResult: !!t.resultPath,
    provider: getProviderName(),
  };
}

// POST /tryons { photoId, itemId }: створити примірку
tryonsRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });

  const photo = await prisma.userPhoto.findFirst({
    where: { id: parsed.data.photoId, userId: req.userId!, expiresAt: { gt: new Date() } },
  });
  if (!photo) return res.status(404).json({ error: "Фото не знайдено" });

  const item = await prisma.item.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) return res.status(404).json({ error: "Річ не знайдено" });

  const job = await prisma.tryOn.create({
    data: { userId: req.userId!, photoId: photo.id, itemId: item.id },
  });

  // Запускаємо у фоні й одразу відповідаємо; статус клієнт дізнається окремими запитами
  void processTryOn(job.id);
  res.status(201).json(view(job));
});

// GET /tryons/:id: статус примірки (лише власник)
tryonsRouter.get("/:id", async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Некоректні дані" });

  let job = await prisma.tryOn.findFirst({ where: { id: id.data, userId: req.userId! } });
  if (!job) return res.status(404).json({ error: "Примірку не знайдено" });

  if ((job.status === "PENDING" || job.status === "PROCESSING") && Date.now() - job.createdAt.getTime() > STUCK_MS) {
    job = await prisma.tryOn.update({
      where: { id: job.id },
      data: { status: "FAILED", errorText: "Час очікування вичерпано", finishedAt: new Date() },
    });
  }
  res.json(view(job));
});

// GET /tryons/:id/result: картинка результату (приватна, потрібен токен власника)
tryonsRouter.get("/:id/result", async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return res.status(400).json({ error: "Некоректні дані" });

  const job = await prisma.tryOn.findFirst({ where: { id: id.data, userId: req.userId! } });
  if (!job || !job.resultPath) return res.status(404).json({ error: "Результату немає" });

  const full = resolveUpload(job.resultPath);
  if (!full) return res.status(404).json({ error: "Результату немає" });

  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(full, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: "Результату немає" });
  });
});