import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../app";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { singleImage } from "../middleware/upload";
import { detectImage, saveImage, removeFile } from "../lib/files";

export const meRouter = Router();
meRouter.use(requireAuth);

function publicUser(u: any) {
  const { passwordHash, ...rest } = u;
  return rest;
}

// GET /me: поточний користувач
meRouter.get("/", async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Користувача не знайдено" });
  res.json(publicUser(user));
});

const updateSchema = z.object({
  email: z.string().email().optional(),
  nickname: z.string().regex(/^[a-zA-Z0-9._]{3,20}$/).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  theme: z.enum(["day", "night", "system"]).optional(),
  heightCm: z.number().int().min(120).max(230).optional(),
  chestCm: z.number().int().min(60).max(160).optional(),
  waistCm: z.number().int().min(45).max(150).optional(),
  hipsCm: z.number().int().min(60).max(170).optional(),
});

// PATCH /me: змінити нікнейм, ім'я, тему, мірки
meRouter.patch("/", async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Невірні дані", details: parsed.error.flatten().fieldErrors });
  }
  if (parsed.data.nickname) {
    const taken = await prisma.user.findFirst({
      where: { nickname: parsed.data.nickname, NOT: { id: req.userId } },
    });
    if (taken) return res.status(409).json({ error: "Нікнейм уже зайнятий" });
  }
  const data = { ...parsed.data };
  if (data.email) {
    data.email = data.email.toLowerCase();
    const taken = await prisma.user.findFirst({
      where: { email: data.email, NOT: { id: req.userId } },
    });
    if (taken) return res.status(409).json({ error: "Email уже зайнятий" });
  }
  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json(publicUser(user));
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Пароль має містити щонайменше 8 символів"),
});

// POST /me/password: змінити пароль (потрібно ввести поточний)
meRouter.post("/password", async (req: AuthRequest, res) => {
  const parsed = passwordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Невірні дані", details: parsed.error.flatten().fieldErrors });
  }
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "Користувача не знайдено" });
  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return res.status(403).json({ error: "Поточний пароль невірний" });
  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ ok: true });
});

// POST /me/avatar: завантажити аватарку (поле "file")
meRouter.post("/avatar", singleImage(5), async (req: AuthRequest, res) => {
  if (!req.file) return res.status(400).json({ error: "Файл не передано" });
  const ext = detectImage(req.file.buffer);
  if (!ext) return res.status(415).json({ error: "Підтримуються лише JPG, PNG та WebP" });
  const current = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!current) return res.status(404).json({ error: "Користувача не знайдено" });
  const avatarPath = await saveImage("avatars", req.file.buffer, ext);
  const user = await prisma.user.update({ where: { id: req.userId }, data: { avatarPath } });
  await removeFile(current.avatarPath);
  res.json(publicUser(user));
});

// DELETE /me/avatar: прибрати аватарку
meRouter.delete("/avatar", async (req: AuthRequest, res) => {
  const current = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!current) return res.status(404).json({ error: "Користувача не знайдено" });
  const user = await prisma.user.update({ where: { id: req.userId }, data: { avatarPath: null } });
  await removeFile(current.avatarPath);
  res.json(publicUser(user));
});
