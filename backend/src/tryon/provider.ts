import fs from "fs/promises";

export type GarmentInfo = { name: string; color: string; imageUrl: string };

// Провайдер примірки: приймає фото людини й річ, повертає готову картинку.
export interface TryOnProvider {
  name: string;
  run(personFile: string, garment: GarmentInfo): Promise<Buffer>;
}

// Заглушка: імітує роботу ШІ (пауза 4 секунди) і повертає фото без змін
const stub: TryOnProvider = {
  name: "stub",
  async run(personFile) {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    return fs.readFile(personFile);
  },
};

export function getProviderName(): string {
  return process.env.TRYON_PROVIDER || "stub";
}

export function getProvider(): TryOnProvider {
  const name = getProviderName();
  if (name === "stub") return stub;
  throw new Error(`Невідомий провайдер примірки: ${name}`);
}