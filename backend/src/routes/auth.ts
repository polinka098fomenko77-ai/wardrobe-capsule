import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../app";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Пароль має містити щонайменше 8 символів"),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nickname: z.string().regex(/^[a-zA-Z0-9._]{3,20}$/, "Нікнейм: 3-20 символів, літери, цифри, крапка, підкреслення"),
  heightCm: z.number().int().min(120).max(230),
  chestCm: z.number().int().min(60).max(160),
  waistCm: z.number().int().min(45).max(150),
  hipsCm: z.number().int().min(60).max(170),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(userId: number) {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
}

// Дані користувача без пароля
function publicUser(u: any) {
  const { passwordHash, ...rest } = u;
  return rest;
}

// POST /auth/register
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Невірні дані", details: parsed.error.flatten().fieldErrors });
  }
  const { password, email, nickname, ...rest } = parsed.data;

  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: email.toLowerCase() }, { nickname }] },
  });
  if (exists) {
    return res.status(409).json({ error: "Email або нікнейм уже зайняті" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { ...rest, email: email.toLowerCase(), nickname, passwordHash },
  });
  res.status(201).json({ token: signToken(user.id), user: publicUser(user) });
});

// POST /auth/login
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Невірні дані" });
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  const ok = user && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) {
    return res.status(401).json({ error: "Невірний email або пароль" });
  }
  res.json({ token: signToken(user.id), user: publicUser(user) });
});
