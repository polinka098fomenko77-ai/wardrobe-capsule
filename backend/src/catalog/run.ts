import "dotenv/config";
import { prisma } from "../app";
import { refreshCatalog } from "./refresh";

// npm run refresh        : оновити каталог зараз
// npm run refresh -- 1   : показати, як виглядатиме каталог через 1 день (для демонстрації)
async function main() {
  const offset = Number(process.argv[2] ?? 0) || 0;
  const stats = await refreshCatalog({ dayOffset: offset });
  console.table(stats);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit();
  });