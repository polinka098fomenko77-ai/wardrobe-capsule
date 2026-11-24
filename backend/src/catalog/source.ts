import { SHOPIFY_STORES, fetchShopifyStore } from "./shopify";
export type SourceItem = {
  externalId: string;
  name: string;
  color: string;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  sizes: { size: string; inStock: boolean }[];
};

export const STORES = [
  { name: "Zara", siteUrl: "https://www.zara.com", factor: 1.15 },
  { name: "Bershka", siteUrl: "https://www.bershka.com", factor: 0.85 },
  { name: "Stradivarius", siteUrl: "https://www.stradivarius.com", factor: 0.9 },
];

const TYPES = [
  { key: "tee", name: "Базова футболка", base: 450 },
  { key: "shirt", name: "Сорочка оверсайз", base: 1100 },
  { key: "hoodie", name: "Худі", base: 1500 },
  { key: "sweater", name: "Светр у рубчик", base: 1300 },
  { key: "jacket", name: "Легка куртка", base: 2400 },
  { key: "blazer", name: "Піджак", base: 2800 },
];
const COLORS = ["чорний", "білий", "сірий", "бежевий", "синій", "зелений"];
const SIZES = ["XS", "S", "M", "L", "XL"];

// Детермінований «випадковий» хеш: той самий рядок завжди дає те саме число від 0 до 1
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // фінальне перемішування бітів, щоб схожі рядки давали різні числа
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// Номер «дня» відносно запуску проєкту. Щодоби змінюється, тож ціни й наявність щодня інші
const EPOCH_DAY = Math.floor(Date.UTC(2026, 10, 22) / 86400000);
export function currentDay(offset = 0): number {
  return Math.max(0, Math.floor(Date.now() / 86400000) - EPOCH_DAY) + offset;
}

export async function fetchStoreCatalog(storeName: string, day: number): Promise<SourceItem[]> {
  const store = STORES.find((s) => s.name === storeName);
  if (!store) return [];
  const result: SourceItem[] = [];

  const make = (id: string, typeIdx: number, color: string) => {
    const t = TYPES[typeIdx];
    const basePrice = t.base * store.factor * (0.9 + hash(id + "p") * 0.3);
    // ціна щодня «пливе» в межах ±6%
    const drift = 1 + (hash(id + "d" + day) - 0.5) * 0.12;
    const price = Math.round((basePrice * drift) / 10) * 10 - 1;
    const soldOut = hash(id + "s" + day) < 0.08;
    const sizes = SIZES.map((size) => ({
      size,
      inStock: !soldOut && hash(id + size + day) > 0.25,
    }));
    result.push({
      externalId: id,
      name: `${t.name}, ${color}`,
      color,
      price,
      currency: "UAH",
      imageUrl: "",
      productUrl: store.siteUrl,
      sizes,
    });
  };

  // Основний асортимент: 6 типів у 3 кольорах
  const si = STORES.indexOf(store);
  for (const [ti, t] of TYPES.entries()) {
    for (let k = 0; k < 3; k++) {
      const color = COLORS[(ti + k * 2 + si) % COLORS.length];
      const id = `${store.name.toLowerCase()}-${t.key}-${color}`;
      // ~5% речей цього дня зникають з сайту (з'являться знову іншого дня)
      if (day > 0 && hash(id + "gone" + day) < 0.05) continue;
      make(id, ti, color);
    }
  }

  // Новинки: одна нова річ на день (останні 5 днів)
  for (let d = Math.max(1, day - 4); d <= day; d++) {
    const ti = Math.floor(hash(store.name + "nt" + d) * TYPES.length);
    const color = COLORS[Math.floor(hash(store.name + "nc" + d) * COLORS.length)];
    make(`${store.name.toLowerCase()}-new-${d}-${TYPES[ti].key}`, ti, color);
  }

  return result;
}
// Джерела каталогу: CATALOG_SOURCE=shopify (реальні магазини) або mock (імітація, за замовчуванням)
export type Source = { name: string; siteUrl: string; fetch: (day: number) => Promise<SourceItem[]> };

export function getSources(): Source[] {
  if ((process.env.CATALOG_SOURCE || "mock") === "shopify") {
    return SHOPIFY_STORES.map((s) => ({ name: s.name, siteUrl: s.baseUrl, fetch: () => fetchShopifyStore(s) }));
  }
  return STORES.map((s) => ({ name: s.name, siteUrl: s.siteUrl, fetch: (day: number) => fetchStoreCatalog(s.name, day) }));
}
