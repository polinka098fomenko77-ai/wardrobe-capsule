import { test } from "node:test";
import assert from "node:assert/strict";
import { STORES, fetchStoreCatalog } from "./source";

test("тестове джерело: однаковий день дає однаковий каталог", async () => {
  const name = STORES[0].name;
  const a = await fetchStoreCatalog(name, 5);
  const b = await fetchStoreCatalog(name, 5);
  assert.deepEqual(a, b);
});

test("тестове джерело: речі кожного магазину мають коректні поля", async () => {
  for (const s of STORES) {
    const items = await fetchStoreCatalog(s.name, 3);
    assert.ok(items.length > 0, `${s.name}: порожній каталог`);
    for (const it of items) {
      assert.ok(it.name.length > 0);
      assert.ok(it.price > 0);
      assert.ok(Array.isArray(it.sizes));
    }
  }
});
