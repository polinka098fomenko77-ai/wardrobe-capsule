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

// Hugging Face Space (IDM-VTON) через gradio client. Безкоштовно, але через спільну чергу.
const TIMEOUT_MS = 5 * 60 * 1000;

const huggingFace: TryOnProvider = {
  name: "hf",
  async run(personFile, garment) {
    const token = process.env.HF_TOKEN;
    const space = process.env.HF_TRYON_SPACE || "yisol/IDM-VTON";
    const { Client, handle_file } = await import("@gradio/client");

    const personBuf = await fs.readFile(personFile);
    const garmentRes = await fetch(garment.imageUrl);
    if (!garmentRes.ok) {
      throw new Error(`Не вдалося завантажити фото речі: HTTP ${garmentRes.status}`);
    }
    const garmentBuf = Buffer.from(await garmentRes.arrayBuffer());

    const app = await Client.connect(space, token ? { hf_token: token as `hf_${string}` } : undefined);

    const job = app.predict("/tryon", {
      dict: {
        background: handle_file(new Blob([new Uint8Array(personBuf)])),
        layers: [],
        composite: null,
      },
      garm_img: handle_file(new Blob([new Uint8Array(garmentBuf)])),
      garment_des: garment.name,
      is_checked: true,
      is_checked_crop: true,
      denoise_steps: 30,
      seed: 42,
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Час очікування ШІ вичерпано")), TIMEOUT_MS)
    );
    const result: any = await Promise.race([job, timeout]);

    const out = result?.data?.[0];
    const url: string | undefined = out?.url || out?.path;
    if (!url) throw new Error("ШІ не повернув зображення");

    const imgRes = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
    if (!imgRes.ok) throw new Error(`Не вдалося отримати результат: HTTP ${imgRes.status}`);
    return Buffer.from(await imgRes.arrayBuffer());
  },
};

export function getProviderName(): string {
  return process.env.TRYON_PROVIDER || "stub";
}

export function getProvider(): TryOnProvider {
  const name = getProviderName();
  if (name === "stub") return stub;
  if (name === "hf") return huggingFace;
  throw new Error(`Невідомий провайдер примірки: ${name}`);
}
