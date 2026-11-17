// Клієнт для звернень до backend. Токен беремо з localStorage.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  nickname: string;
  avatarPath: string | null;
  heightCm: number;
  chestCm: number;
  waistCm: number;
  hipsCm: number;
  theme: "day" | "night" | "system";
};

export class ApiError extends Error {
  details?: Record<string, string[]>;
  status: number;
  constructor(message: string, status: number, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const TOKEN_KEY = "token";
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Сервер недоступний. Перевірте, що backend запущено.", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Помилка запиту", res.status, data.details);
  return data as T;
}

export const avatarUrl = (u: { avatarPath: string | null }) =>
  u.avatarPath ? `${API_URL}/uploads/${u.avatarPath}` : undefined;

// Завантаження файлу (multipart). Поле має називатися "file"
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
  } catch {
    throw new ApiError("Сервер недоступний", 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Помилка запиту", res.status, data.details);
  return data as T;
}

// Приватні зображення потребують токен, тому беремо їх через fetch і робимо тимчасове посилання
export async function apiBlobUrl(path: string): Promise<string> {
  const token = getToken();
  const res = await fetch(API_URL + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError("Не вдалося завантажити зображення", res.status);
  return URL.createObjectURL(await res.blob());
}
