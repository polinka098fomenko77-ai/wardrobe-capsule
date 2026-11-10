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
