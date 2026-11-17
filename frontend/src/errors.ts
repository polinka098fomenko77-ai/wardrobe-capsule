import { ApiError } from "./api";
import type { Key } from "./i18n";

// Перетворює помилку сервера на ключ перекладу (щоб текст відповідав обраній мові)
export function errorKey(err: unknown, context: "login" | "register" | "password" | "other"): Key {
  if (err instanceof ApiError) {
    if (err.status === 0) return "err.server";
    if (err.status === 401 && context === "login") return "err.login";
    if (err.status === 403 && context === "password") return "err.currentPassword";
    if (err.status === 413) return "err.tooLarge";
    if (err.status === 415) return "err.fileType";
    if (err.status === 409) return "err.taken";
    if (err.status === 400) return "err.invalid";
  }
  return "err.unknown";
}
