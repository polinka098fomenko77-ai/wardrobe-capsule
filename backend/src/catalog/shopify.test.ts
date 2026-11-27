import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeColor, parseProducts, type ShopifyStore } from "./shopify";

type Products = Parameters<typeof parseProducts>[1];

const uah: ShopifyStore = { name: "Test", baseUrl: "https://t.example", currency: "UAH" };
const eur: ShopifyStore = { name: "Euro", baseUrl: "https://e.example", currency: "EUR", rateToUah: 48 };

test("normalizeColor: англійські й українські назви зводяться до базових кольорів", () => {
  assert.equal(normalizeColor("Black"), "чорний");
  assert.equal(normalizeColor("Чорний"), "чорний");
  assert.equal(normalizeColor("Ivory"), "білий");
  assert.equal(normalizeColor("Dark Grey"), "сірий");
  assert.equal(normalizeColor("Camel"), "бежевий");
  assert.equal(normalizeColor("Navy Blue"), "синій");
  assert.equal(normalizeColor("Olive green"), "зелений");
});

test("normalizeColor: невідомий колір дає «інший»", () => {
  assert.equal(normalizeColor("Red"), "інший");
  assert.equal(normalizeColor(""), "інший");
});

test("parseProducts: одна проста річ з розмірами й наявністю", () => {
  const products: Products = [
    {
      id: 1,
      title: "Блуза Test",
      handle: "bluza",
      options: [{ name: "Size", position: 1 }],
      variants: [
        { price: "1000.00", available: true, option1: "S" },
        { price: "1200.00", available: false, option1: "M" },
      ],
      images: [{ src: "https://img.example/1.jpg" }],
    },
  ];
  const items = parseProducts(uah, products);
  assert.equal(items.length, 1);
  const it = items[0];
  assert.equal(it.externalId, "1");
  assert.equal(it.name, "Блуза Test");
  assert.equal(it.price, 1000); // мінімальна ціна серед варіантів
  assert.equal(it.currency, "UAH");
  assert.equal(it.imageUrl, "https://img.example/1.jpg");
  assert.equal(it.productUrl, "https://t.example/products/bluza");
  assert.deepEqual(it.sizes, [
    { size: "S", inStock: true },
    { size: "M", inStock: false },
  ]);
});

test("parseProducts: не верхній одяг пропускається", () => {
  const products: Products = [
    { id: 2, title: "Сукня Red", handle: "dress", variants: [{ price: "500", available: true }] },
    { id: 3, title: "Pleated skirt", handle: "skirt", variants: [{ price: "500", available: true }] },
  ];
  assert.deepEqual(parseProducts(uah, products), []);
});

test("parseProducts: одна річ на кожен колір", () => {
  const products: Products = [
    {
      id: 4,
      title: "Classic T-shirt",
      handle: "tee",
      options: [
        { name: "Color", position: 1 },
        { name: "Size", position: 2 },
      ],
      variants: [
        { price: "800", available: true, option1: "Black", option2: "S" },
        { price: "800", available: false, option1: "Black", option2: "M" },
        { price: "800", available: true, option1: "White", option2: "S" },
      ],
    },
  ];
  const items = parseProducts(uah, products);
  assert.equal(items.length, 2);
  assert.deepEqual(items.map((i) => i.color), ["чорний", "білий"]);
  assert.deepEqual(items.map((i) => i.externalId), ["4-black", "4-white"]);
  assert.equal(items[0].name, "Classic T-shirt, Black");
  assert.deepEqual(items[0].sizes, [
    { size: "S", inStock: true },
    { size: "M", inStock: false },
  ]);
});

test("parseProducts: ціни в євро переводяться у гривні за курсом", () => {
  const products: Products = [
    { id: 5, title: "Silk Top", handle: "silk-top", variants: [{ price: "100.00", available: true }] },
  ];
  const [it] = parseProducts(eur, products);
  assert.equal(it.price, 4800);
  assert.equal(it.currency, "UAH");
});

test("parseProducts: якщо розміри не розпізнано, показуються всі розміри", () => {
  const products: Products = [
    { id: 6, title: "Silk Top", handle: "silk-top", variants: [{ price: "100", available: true }] },
  ];
  const [it] = parseProducts(uah, products);
  assert.deepEqual(it.sizes.map((s) => s.size), ["XS", "S", "M", "L", "XL"]);
  assert.ok(it.sizes.every((s) => s.inStock));
});

test("parseProducts: XXL зводиться до XL, а «XS/S» розбивається на два розміри", () => {
  const products: Products = [
    {
      id: 7,
      title: "Linen shirt",
      handle: "shirt",
      options: [{ name: "Size", position: 1 }],
      variants: [
        { price: "900", available: true, option1: "XS/S" },
        { price: "900", available: true, option1: "XXL" },
      ],
    },
  ];
  const [it] = parseProducts(uah, products);
  assert.deepEqual(it.sizes.map((s) => s.size), ["XS", "S", "XL"]);
});

test("parseProducts: речі з нульовою ціною пропускаються", () => {
  const products: Products = [
    { id: 8, title: "Free Top", handle: "free", variants: [{ price: "0.00", available: true }] },
  ];
  assert.deepEqual(parseProducts(uah, products), []);
});

test("parseProducts: обмеження кількості речей", () => {
  const products: Products = [1, 2, 3].map((n) => ({
    id: 100 + n,
    title: `Hoodie ${n}`,
    handle: `h${n}`,
    variants: [{ price: "700", available: true }],
  }));
  assert.equal(parseProducts(uah, products, 2).length, 2);
});

test("parseProducts: зображення варіанта має пріоритет над загальним", () => {
  const products: Products = [
    {
      id: 9,
      title: "Cotton sweater",
      handle: "sw",
      variants: [{ price: "1500", available: true, featured_image: { src: "https://img.example/variant.jpg" } }],
      images: [{ src: "https://img.example/general.jpg" }],
    },
  ];
  assert.equal(parseProducts(uah, products)[0].imageUrl, "https://img.example/variant.jpg");
});
