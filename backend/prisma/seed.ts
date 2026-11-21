import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ТЕСТОВИЙ набір: імітація каталогу трьох магазинів (реальні товари з'являться через адаптер джерела)
const stores = [
  { name: "Zara", siteUrl: "https://www.zara.com", factor: 1.15 },
  { name: "Bershka", siteUrl: "https://www.bershka.com", factor: 0.85 },
  { name: "Stradivarius", siteUrl: "https://www.stradivarius.com", factor: 0.9 },
];

const types = [
  { key: "tee", name: "Базова футболка", base: 450 },
  { key: "shirt", name: "Сорочка оверсайз", base: 1100 },
  { key: "hoodie", name: "Худі", base: 1500 },
  { key: "sweater", name: "Светр у рубчик", base: 1300 },
  { key: "jacket", name: "Легка куртка", base: 2400 },
  { key: "blazer", name: "Піджак", base: 2800 },
];

const colors = ["чорний", "білий", "сірий", "бежевий", "синій", "зелений"];
const sizes = ["XS", "S", "M", "L", "XL"];

// Детермінований «випадковий» генератор: щоразу ті самі дані
let state = 42;
const rnd = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;

async function main() {
  let count = 0;
  for (const s of stores) {
    const store = await prisma.store.upsert({
      where: { name: s.name },
      update: { siteUrl: s.siteUrl },
      create: { name: s.name, siteUrl: s.siteUrl },
    });

    for (const [ti, t] of types.entries()) {
      // кожна річ у трьох кольорах
      for (let k = 0; k < 3; k++) {
        const color = colors[(ti + k * 2 + stores.indexOf(s)) % colors.length];
        const externalId = `${s.name.toLowerCase()}-${t.key}-${color}`;
        const price = Math.round((t.base * s.factor * (0.9 + rnd() * 0.3)) / 10) * 10 - 1;

        // ~8% речей повністю розпродані
        const soldOut = rnd() < 0.08;
        const stock = sizes.map((size) => ({ size, inStock: !soldOut && rnd() > 0.25 }));
        const isAvailable = stock.some((x) => x.inStock);

        const item = await prisma.item.upsert({
          where: { storeId_externalId: { storeId: store.id, externalId } },
          update: { price, isAvailable, lastSeenAt: new Date() },
          create: {
            storeId: store.id,
            externalId,
            name: `${t.name}, ${color}`,
            category: "top",
            color,
            price,
            imageUrl: "",
            productUrl: s.siteUrl,
            isAvailable,
          },
        });

        for (const x of stock) {
          await prisma.itemSize.upsert({
            where: { itemId_size: { itemId: item.id, size: x.size } },
            update: { inStock: x.inStock },
            create: { itemId: item.id, size: x.size, inStock: x.inStock },
          });
        }
        count++;
      }
    }
  }
  console.log(`Готово: ${stores.length} магазини, ${count} речей`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());