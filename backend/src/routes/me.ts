import { Router } from "express";
import { z } from "zod";
import { prisma } from "../app";
import { requireAuth, AuthRequest } from "../middleware/auth";

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
  const user = await prisma.user.update({ where: { id: req.userId }, data: parsed.data });
  res.json(publicUser(user));
});
