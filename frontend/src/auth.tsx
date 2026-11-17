import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getToken, setToken, type User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
  setUser: (u: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // При завантаженні сторінки: якщо є токен, питаємо у сервера, хто це
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api<User>("/me")
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const r = await api<{ token: string; user: User }>("/auth/login", { method: "POST", body: { email, password } });
    setToken(r.token);
    setUser(r.user);
  }

  async function register(data: Record<string, unknown>) {
    const r = await api<{ token: string; user: User }>("/auth/register", { method: "POST", body: data });
    setToken(r.token);
    setUser(r.user);
  }

  async function updateUser(patch: Partial<User>) {
    setUser(await api<User>("/me", { method: "PATCH", body: patch }));
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateUser, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
