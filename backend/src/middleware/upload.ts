import multer from "multer";
import { Request, Response, NextFunction } from "express";

// Приймає один файл у полі "file", тримає його в пам'яті. Обмежує розмір.
export function singleImage(maxMb: number) {
  const handler = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
  }).single("file");

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: unknown) => {
      if (!err) return next();
      const tooBig = (err as { code?: string }).code === "LIMIT_FILE_SIZE";
      res.status(tooBig ? 413 : 400).json({ error: tooBig ? `Файл завеликий (максимум ${maxMb} МБ)` : "Не вдалося прийняти файл" });
    });
  };
}
