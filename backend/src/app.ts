import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

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
