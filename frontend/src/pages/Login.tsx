import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuth } from "../auth";
import { ApiError } from "../api";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/profile" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      await login(String(f.get("email")).trim(), String(f.get("password")));
      navigate("/profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Невідома помилка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="center">
        <form className="form narrow" onSubmit={onSubmit}>
          <div>
            <h1 className="disp form-title">З поверненням</h1>
            <p className="muted">Увійдіть, щоб продовжити примірку.</p>
          </div>
          <div className="field">
            <label htmlFor="email" className="lbl">Email</label>
            <input id="email" name="email" type="email" placeholder="name@example.com" />
          </div>
          <div className="field">
            <label htmlFor="password" className="lbl">Пароль</label>
            <input id="password" name="password" type="password" />
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions">
            <button className="btn" type="submit" disabled={busy}>{busy ? "Входимо..." : "Увійти"}</button>
            <span className="muted">
              Немає акаунта? <Link to="/register" className="link">Зареєструватися</Link>
            </span>
          </div>
        </form>
      </main>
    </div>
  );
}
