import { Router } from "express";
import { z } from "zod";
import { prisma } from "../app";
import { requireAuth, AuthRequest } from "../middleware/auth";

export const wardrobeRouter = Router();
wardrobeRouter.use(requireAuth);

const addSchema = z.object({ itemId: z.number().int().positive() });
const idSchema = z.coerce.number().int().positive();

// GET /wardrobe/ids: лише номери збережених речей (щоб у каталозі підсвітити серце)
wardrobeRouter.get("/ids", async (req: AuthRequest, res) => {
  const rows = await prisma.wardrobeItem.findMany({
    where: { userId: req.userId! },
    select: { itemId: true },
  });
  res.json({ ids: rows.map((r) => r.itemId) });
});

// GET /wardrobe: збережені речі користувача (нові зверху)
wardrobeRouter.get("/", async (req: AuthRequest, res) => {
  const rows = await prisma.wardrobeItem.findMany({
    where: { userId: req.userId! },
    orderBy: { savedAt: "desc" },
    include: { item: { include: { store: true, sizes: true } } },
  });
  res.json({
    items: rows.map(({ item }) => ({
      id: item.id,
      name: item.name,
      store: item.store.name,
      color: item.color,
      price: Number(item.price),
      currency: item.currency,
      imageUrl: item.imageUrl,
      productUrl: item.productUrl,
      isAvailable: item.isAvailable,
      sizes: item.sizes.filter((s) => s.inStock).map((s) => s.size),
    })),
  });
});

// POST /wardrobe { itemId }: додати річ (повторне додавання нічого не ламає)
wardrobeRouter.post("/", async (req: AuthRequest, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });

  const item = await prisma.item.findUnique({ where: { id: parsed.data.itemId } });
  if (!item) return res.status(404).json({ error: "Річ не знайдено" });

  await prisma.wardrobeItem.upsert({
    where: { userId_itemId: { userId: req.userId!, itemId: item.id } },
    update: {},
    create: { userId: req.userId!, itemId: item.id },
  });
  res.status(201).json({ ok: true });
});

// DELETE /wardrobe/:itemId: прибрати річ зі свого гардероба
wardrobeRouter.delete("/:itemId", async (req: AuthRequest, res) => {
  const id = idSchema.safeParse(req.params.itemId);
  if (!id.success) return res.status(400).json({ error: "Некоректні дані" });

  await prisma.wardrobeItem.deleteMany({ where: { userId: req.userId!, itemId: id.data } });
  res.status(204).end();
});