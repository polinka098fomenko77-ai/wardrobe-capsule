import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuth } from "../auth";
import { useI18n, type Key } from "../i18n";
import { errorKey } from "../errors";

export default function Login() {
  const { user, login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<Key | "">("");
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
      setError(errorKey(err, "login"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="center">
        <form className="card form narrow" onSubmit={onSubmit}>
          <div>
            <h1 className="disp form-title">{t("login.title")}</h1>
            <p className="muted">{t("login.sub")}</p>
          </div>
          <div className="field">
            <label htmlFor="email" className="lbl">{t("f.email")}</label>
            <input id="email" name="email" type="email" placeholder="name@example.com" />
          </div>
          <div className="field">
            <label htmlFor="password" className="lbl">{t("f.password")}</label>
            <input id="password" name="password" type="password" />
          </div>
          {error && <p className="error" role="alert">{t(error)}</p>}
          <div className="actions">
            <button className="btn" type="submit" disabled={busy}>{busy ? t("login.busy") : t("login.submit")}</button>
            <span className="muted">
              {t("login.none")} <Link to="/register" className="link">{t("login.register")}</Link>
            </span>
          </div>
        </form>
      </main>
    </div>
  );
}
