import { prisma } from "../app";
import { STORES, currentDay, fetchStoreCatalog } from "./source";

export type RefreshStats = { store: string; created: number; updated: number; hidden: number };

let running = false;

// Одне оновлення каталогу: усі магазини по черзі
export async function refreshCatalog(opts: { dayOffset?: number } = {}): Promise<RefreshStats[]> {
  if (running) {
    console.log("[catalog] оновлення вже виконується, пропускаю");
    return [];
  }
  running = true;
  const startedAt = new Date();
  const day = currentDay(opts.dayOffset ?? 0);
  const stats: RefreshStats[] = [];

  try {
    for (const s of STORES) {
      try {
        const items = await fetchStoreCatalog(s.name, day);

        const store = await prisma.store.upsert({
          where: { name: s.name },
          update: { siteUrl: s.siteUrl },
          create: { name: s.name, siteUrl: s.siteUrl },
        });

        const before = await prisma.item.count({ where: { storeId: store.id } });

        for (const it of items) {
          const isAvailable = it.sizes.some((x) => x.inStock);
          const row = await prisma.item.upsert({
            where: { storeId_externalId: { storeId: store.id, externalId: it.externalId } },
            update: {
              name: it.name,
              color: it.color,
              price: it.price,
              currency: it.currency,
              imageUrl: it.imageUrl,
              productUrl: it.productUrl,
              isAvailable,
              lastSeenAt: startedAt,
            },
            create: {
              storeId: store.id,
              externalId: it.externalId,
              name: it.name,
              category: "top",
              color: it.color,
              price: it.price,
              currency: it.currency,
              imageUrl: it.imageUrl,
              productUrl: it.productUrl,
              isAvailable,
              lastSeenAt: startedAt,
            },
          });

          for (const x of it.sizes) {
            await prisma.itemSize.upsert({
              where: { itemId_size: { itemId: row.id, size: x.size } },
              update: { inStock: x.inStock },
              create: { itemId: row.id, size: x.size, inStock: x.inStock },
            });
          }
        }

        // Речі, яких магазин цього разу не віддав, ховаємо з каталогу (з бази не видаляємо)
        const hidden = await prisma.item.updateMany({
          where: { storeId: store.id, isAvailable: true, lastSeenAt: { lt: startedAt } },
          data: { isAvailable: false },
        });

        const after = await prisma.item.count({ where: { storeId: store.id } });
        stats.push({
          store: s.name,
          created: after - before,
          updated: items.length - (after - before),
          hidden: hidden.count,
        });
      } catch (e) {
        // Збій одного магазину не повинен зупиняти решту і не ховає його товари
        console.error(`[catalog] ${s.name}: помилка оновлення`, e);
      }
    }
  } finally {
    running = false;
  }

  console.log(`[catalog] оновлено (день ${day}):`, JSON.stringify(stats));
  return stats;
}