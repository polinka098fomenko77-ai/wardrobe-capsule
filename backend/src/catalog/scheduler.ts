import "dotenv/config";
import { schedule } from "node-cron";
import { prisma } from "../app";
import { refreshCatalog } from "./refresh";

// Розклад береться з .env (CATALOG_CRON). За замовчуванням щодня о 03:00 за Києвом
const EXPR = process.env.CATALOG_CRON || "0 3 * * *";

schedule(
  EXPR,
  () => {
    refreshCatalog().catch((e) => console.error("[catalog] збій за розкладом", e));
  },
  { timezone: "Europe/Kyiv" },
);
console.log(`[catalog] щоденне оновлення за розкладом: ${EXPR} (Europe/Kyiv)`);

// Якщо сервер був вимкнений і оновлення пропущено, наздоганяємо при старті (дані старші за добу)
setTimeout(async () => {
  try {
    const last = await prisma.item.aggregate({ _max: { lastSeenAt: true } });
    const at = last._max.lastSeenAt;
    if (!at || Date.now() - at.getTime() > 24 * 3600 * 1000) {
      console.log("[catalog] дані застаріли, оновлюю при старті");
      await refreshCatalog();
    }
  } catch (e) {
    console.error("[catalog] перевірка при старті не вдалася", e);
  }
}, 5000);