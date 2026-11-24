import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "../app";
import { UPLOAD_DIR, resolveUpload, detectImage } from "../lib/files";
import { getProvider } from "./provider";

// Виконує одну примірку у фоні: PENDING -> PROCESSING -> DONE або FAILED
export async function processTryOn(id: number) {
  try {
    const job = await prisma.tryOn.findUnique({ where: { id } });
    if (!job) return;

    await prisma.tryOn.update({ where: { id }, data: { status: "PROCESSING" } });

    const photo = await prisma.userPhoto.findUnique({ where: { id: job.photoId } });
    const item = await prisma.item.findUnique({ where: { id: job.itemId } });
    if (!photo || !item) throw new Error("Фото або річ не знайдено");

    const personFile = resolveUpload(photo.storagePath);
    if (!personFile) throw new Error("Некоректний шлях до фото");

    const result = await getProvider().run(personFile, {
      name: item.name,
      color: item.color,
      imageUrl: item.imageUrl,
    });

    // Результат зберігаємо в uploads/results (приватна папка, віддається лише власнику з токеном)
    const ext = detectImage(result) ?? "jpg";
    const dir = path.join(UPLOAD_DIR, "results");
    await fs.mkdir(dir, { recursive: true });
    const name = crypto.randomBytes(16).toString("hex") + "." + ext;
    await fs.writeFile(path.join(dir, name), result);

    await prisma.tryOn.update({
      where: { id },
      data: { status: "DONE", resultPath: `results/${name}`, finishedAt: new Date() },
    });
  } catch (e) {
    console.error(`[tryon] #${id}: помилка`, e);
    await prisma.tryOn
      .update({
        where: { id },
        data: {
          status: "FAILED",
          errorText: e instanceof Error ? e.message : "Невідома помилка",
          finishedAt: new Date(),
        },
      })
      .catch(() => {});
  }
}