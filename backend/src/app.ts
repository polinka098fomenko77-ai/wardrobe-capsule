import express from "express";
import cors from "cors";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { UPLOAD_DIR } from "./lib/files";

export const prisma = new PrismaClient();
export const app = express();

app.use(cors());
app.use(express.json());

// Перевірка, що сервер і база живі
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "up" });
  } catch {
    res.status(503).json({ status: "error", db: "down" });
  }
});

// Маршрути підключаємо після створення app і prisma (щоб уникнути циклічного імпорту)
import { authRouter } from "./routes/auth";
import { meRouter } from "./routes/me";
import { photosRouter } from "./routes/photos";
import { itemsRouter } from "./routes/items";
import { wardrobeRouter } from "./routes/wardrobe";
import { tryonsRouter } from "./routes/tryons";
app.use("/auth", authRouter);
app.use("/me", meRouter);
app.use("/photos", photosRouter);
app.use("/items", itemsRouter);
app.use("/wardrobe", wardrobeRouter);
app.use("/tryons", tryonsRouter);
// Аватарки публічні (назви випадкові). Фото для примірки віддаються лише власнику через /photos/:id/file
app.use("/uploads/avatars", express.static(path.join(UPLOAD_DIR, "avatars")));