import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../app";
import { requireAuth } from "../middleware/auth";

export const itemsRouter = Router();
itemsRouter.use(requireAuth);

const SIZES = ["XS", "S", "M", "L", "XL"] as const;
const SIZE_ORDER: readonly string[] = SIZES;

const querySchema = z.object({
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  size: z.enum(SIZES).optional(),
  color: z.string().max(30).optional(),
  store: z.string().max(40).optional(),
  sort: z.enum(["price_asc", "price_desc", "new"]).default("price_asc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
});

const ORDER: Record<string, Prisma.ItemOrderByWithRelationInput> = {
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  new: { lastSeenAt: "desc" },
};

// GET /items/meta: значення для фільтрів (кольори, магазини, розміри, діапазон цін)
itemsRouter.get("/meta", async (_req, res) => {
  const base = { isAvailable: true };
  const [colors, stores, price] = await Promise.all([
    prisma.item.findMany({ where: base, distinct: ["color"], select: { color: true }, orderBy: { color: "asc" } }),
    prisma.store.findMany({ where: { items: { some: { isAvailable: true } } }, select: { name: true }, orderBy: { name: "asc" } }),
    prisma.item.aggregate({ where: base, _min: { price: true }, _max: { price: true } }),
  ]);
  res.json({
    colors: colors.map((c) => c.color),
    stores: stores.map((s) => s.name),
    sizes: SIZES,
    minPrice: Number(price._min.price ?? 0),
    maxPrice: Number(price._max.price ?? 0),
  });
});

// GET /items: каталог. Завжди лише речі, які зараз є в наявності
itemsRouter.get("/", async (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні параметри", details: parsed.error.issues });
  const q = parsed.data;

  const where: Prisma.ItemWhereInput = {
    isAvailable: true,
    ...(q.minPrice !== undefined || q.maxPrice !== undefined ? { price: { gte: q.minPrice, lte: q.maxPrice } } : {}),
    ...(q.color ? { color: q.color } : {}),
    ...(q.store ? { store: { name: q.store } } : {}),
    ...(q.size ? { sizes: { some: { size: q.size, inStock: true } } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy: [ORDER[q.sort], { id: "asc" }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { store: { select: { name: true } }, sizes: { where: { inStock: true }, select: { size: true } } },
    }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    store: r.store.name,
    color: r.color,
    price: Number(r.price),
    currency: r.currency,
    imageUrl: r.imageUrl,
    productUrl: r.productUrl,
    sizes: r.sizes.map((s) => s.size).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)),
  }));

  res.json({ items, total, page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)) });
});