import { SHOPIFY_STORES, fetchShopifyStore } from "./shopify";

// npm run probe: перевірка магазинів без бази даних. Показує, що вдалося завантажити
async function main() {
  for (const s of SHOPIFY_STORES) {
    try {
      const items = await fetchShopifyStore(s);
      const colors: Record<string, number> = {};
      for (const it of items) colors[it.color] = (colors[it.color] ?? 0) + 1;
      const noPhoto = items.filter((it) => !it.imageUrl).length;

      console.log(`\n${s.name} (${s.baseUrl}): підходящих речей ${items.length}, без фото ${noPhoto}`);
      console.log("Кольори:", JSON.stringify(colors));
      for (const it of items.slice(0, 3)) {
        const sizes = it.sizes.filter((x) => x.inStock).map((x) => x.size).join("/") || "немає";
        console.log(`  - ${it.name} | ${it.color} | ${it.price} ${it.currency} | розміри: ${sizes}`);
        console.log(`    фото: ${it.imageUrl || "немає"}`);
      }
    } catch (e) {
      console.log(`\n${s.name}: ПОМИЛКА: ${e instanceof Error ? e.message : e}`);
    }
  }
}

main();