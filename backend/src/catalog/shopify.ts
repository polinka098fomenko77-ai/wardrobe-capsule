import type { SourceItem } from "./source";

// Магазини на Shopify: каталог береться з публічної адреси <сайт>/products.json.
// currency вказує валюту цін (її в products.json немає): звірте з цінами на самому сайті.
// rateToUah: якщо вказано, ціни з currency переводяться в гривні за цим курсом (щоб фільтр за ціною був однаковий)
export type ShopifyStore = { name: string; baseUrl: string; currency: string; rateToUah?: number };

export const SHOPIFY_STORES: ShopifyStore[] = [
  { name: "Gaptuvalnya", baseUrl: "https://gaptuvalnya.com", currency: "UAH" },
  { name: "Bevza", baseUrl: "https://bevza.com", currency: "UAH" },
  { name: "Alina Balykina", baseUrl: "https://balykina.com", currency: "EUR", rateToUah: 48 },
];

type ShopifyVariant = {
  price: string;
  available: boolean;
  option1?: string | null;
  option2?: string | null;
  option3?: string | null;
  featured_image?: { src: string } | null;
};
type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  product_type?: string;
  tags?: string[] | string;
  options?: { name: string; position: number }[];
  variants: ShopifyVariant[];
  images?: { src: string }[];
};

const SIZES = ["XS", "S", "M", "L", "XL"];

// Кольори каталогу зводимо до шести базових (+ «інший»), щоб працювали фільтри й кружечки
const COLOR_WORDS: [string, string[]][] = [
  ["чорний", ["чорн", "black", "noir"]],
  ["білий", ["біл", "white", "молоч", "milk", "ivory", "айворі", "ecru", "екрю", "cream", "крем"]],
  ["сірий", ["сір", "grey", "gray", "графіт", "graphite", "silver", "срібл"]],
  ["бежевий", ["беж", "beige", "sand", "пісоч", "nude", "нюд", "camel", "кемел", "коричн", "brown", "taupe", "латте", "капучін"]],
  ["синій", ["син", "blue", "navy", "голуб", "блакит", "denim", "джинс"]],
  ["зелений", ["зелен", "green", "olive", "олив", "хакі", "khaki", "мят", "mint", "emerald", "смарагд"]],
];

export function normalizeColor(text: string): string {
  const t = text.toLowerCase();
  for (const [name, words] of COLOR_WORDS) {
    if (words.some((w) => t.includes(w))) return name;
  }
  return "інший";
}

// «XS/S» -> [XS, S]; нерозпізнані значення (one size, числові) повертають []
function sizeTokens(value: string): string[] {
  const up = value.toUpperCase().replace(/\s+/g, "");
  if (up === "XXS") return ["XS"];
  if (up === "XXL" || up === "2XL" || up === "XXXL") return ["XL"];
  return up.split(/[\/,\-–]/).filter((p) => SIZES.includes(p));
}

// Лише верхній одяг: топи, футболки, блузи, сорочки, светри, худі
const TOPS = /(футболк|блуз|сорочк|светр|джемпер|кардиган|світшот|худі|лонгслів|пуловер|майк|боді|t-?shirt|blouse|shirt|sweater|jumper|cardigan|sweatshirt|hoodie|longsleeve|pullover|tank|bodysuit|(^|[^а-яіїєґa-z])(топ|top)([^а-яіїєґa-z]|$))/i;
const NOT_TOPS = /(сукн|dress|спідниц|skirt|штани|trousers|pants|шорти|shorts|комбінезон|jumpsuit|купальник|swim|піжам|pajama|білизн|lingerie|сумк|bag|пасок|belt)/i;

function isTop(p: ShopifyProduct): boolean {
  const tags = Array.isArray(p.tags) ? p.tags.join(" ") : p.tags ?? "";
  const text = `${p.title} ${p.product_type ?? ""} ${tags}`;
  return TOPS.test(text) && !NOT_TOPS.test(text);
}

function optionIndex(p: ShopifyProduct, re: RegExp): number {
  const o = (p.options ?? []).find((x) => re.test(x.name));
  return o ? o.position : 0; // 1, 2 або 3; 0 якщо такої опції немає
}

function optionValue(v: ShopifyVariant, pos: number): string {
  if (pos === 1) return v.option1 ?? "";
  if (pos === 2) return v.option2 ?? "";
  if (pos === 3) return v.option3 ?? "";
  return "";
}

// Перетворює товари Shopify на наші речі: одна річ на кожен колір
export function parseProducts(store: ShopifyStore, products: ShopifyProduct[], max = 120): SourceItem[] {
  const result: SourceItem[] = [];

  for (const p of products) {
    if (!isTop(p) || p.variants.length === 0) continue;

    const colorPos = optionIndex(p, /colou?r|колір|цвет/i);
    const sizePos = optionIndex(p, /size|розмір|размер/i);

    // групуємо варіанти за кольором
    const groups = new Map<string, ShopifyVariant[]>();
    for (const v of p.variants) {
      const key = colorPos ? optionValue(v, colorPos) : "";
      groups.set(key, [...(groups.get(key) ?? []), v]);
    }

    for (const [colorValue, variants] of groups) {
      const prices = variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n) && n > 0);
      if (prices.length === 0) continue;

      const stock = new Map<string, boolean>();
      for (const v of variants) {
        for (const s of sizeTokens(sizePos ? optionValue(v, sizePos) : "")) {
          stock.set(s, (stock.get(s) ?? false) || v.available);
        }
      }
      // розміри не розпізнано (one size, числові): показуємо всі, наявність за будь-яким варіантом
      const anyAvailable = variants.some((v) => v.available);
      const sizes = stock.size > 0
        ? SIZES.filter((s) => stock.has(s)).map((s) => ({ size: s, inStock: stock.get(s)! }))
        : SIZES.map((s) => ({ size: s, inStock: anyAvailable }));

      const colorSource = colorValue || p.title;
      const image = variants.find((v) => v.featured_image)?.featured_image?.src ?? p.images?.[0]?.src ?? "";

      result.push({
        externalId: colorValue ? `${p.id}-${colorValue.toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/g, "-")}` : String(p.id),
        name: groups.size > 1 && colorValue ? `${p.title}, ${colorValue}` : p.title,
        color: normalizeColor(colorSource),
        price: Math.round(Math.min(...prices) * (store.rateToUah ?? 1)),
        currency: store.rateToUah ? "UAH" : store.currency,
        imageUrl: image,
        productUrl: `${store.baseUrl}/products/${p.handle}`,
        sizes,
      });
      if (result.length >= max) return result;
    }
  }
  return result;
}

async function getJson(url: string): Promise<{ products?: ShopifyProduct[] }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; PrimirochnaCourseProject/1.0)", Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return (await res.json()) as { products?: ShopifyProduct[] };
}

// Завантажує каталог магазину (сторінками по 250 товарів, не більше 6 сторінок, з паузами)
export async function fetchShopifyStore(store: ShopifyStore): Promise<SourceItem[]> {
  const all: ShopifyProduct[] = [];
  for (let page = 1; page <= 6; page++) {
    const data = await getJson(`${store.baseUrl}/products.json?limit=250&page=${page}`);
    const batch = data.products ?? [];
    all.push(...batch);
    if (batch.length < 250) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  const max = Number(process.env.SHOPIFY_MAX_ITEMS) || 120;
  return parseProducts(store, all, max);
}