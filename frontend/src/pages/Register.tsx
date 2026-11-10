import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuth } from "../auth";
import { ApiError } from "../api";
import { useI18n, type Key } from "../i18n";
import { errorKey } from "../errors";

const MEASURES: { key: string; label: Key; ph: string }[] = [
  { key: "heightCm", label: "f.height", ph: "168" },
  { key: "chestCm", label: "f.chest", ph: "88" },
  { key: "waistCm", label: "f.waist", ph: "68" },
  { key: "hipsCm", label: "f.hips", ph: "94" },
];

export default function Register() {
  const { user, register } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<Key | "">("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/profile" replace />;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? "").trim();
    const num = (k: string) => Number(f.get(k));
    setError("");
    setFieldErrors({});
    setBusy(true);
    try {
      await register({
        email: text("email"),
        password: String(f.get("password") ?? ""),
        firstName: text("firstName"),
        lastName: text("lastName"),
        nickname: text("nickname"),
        heightCm: num("heightCm"),
        chestCm: num("chestCm"),
        waistCm: num("waistCm"),
        hipsCm: num("hipsCm"),
      });
      navigate("/profile");
    } catch (err) {
      setError(errorKey(err, "register"));
      if (err instanceof ApiError) setFieldErrors(err.details ?? {});
    } finally {
      setBusy(false);
    }
  }

  const bad = (k: string) => Boolean(fieldErrors[k]?.length);

  return (
    <div className="page">
      <Header />
      <main className="split">
        <section className="hero">
          <span className="lbl hero-lbl">{t("hero.label")}</span>
          <h2 className="disp hero-title">
            {t("hero.title1")} <em>{t("hero.title2")}</em> {t("hero.title3")}
          </h2>
          <p className="hero-text">{t("hero.text")}</p>
        </section>

        <form className="card form" onSubmit={onSubmit} noValidate>
          <div className="steps" aria-hidden="true">
            <span className="on" /><span /><span /><span />
          </div>
          <div>
            <h1 className="disp form-title">{t("reg.title")}</h1>
            <p className="muted">{t("reg.sub")}</p>
          </div>

          <div className="grid2">
            <Field name="firstName" label={t("f.firstName")} placeholder="Поліна" error={bad("firstName")} />
            <Field name="lastName" label={t("f.lastName")} placeholder="Фоменко" error={bad("lastName")} />
            <Field name="nickname" label={t("f.nickname")} placeholder="polina" error={bad("nickname")} />
            <Field name="email" label={t("f.email")} type="email" placeholder="name@example.com" error={bad("email")} />
            <div style={{ gridColumn: "span 2" }}>
              <Field name="password" label={t("f.password")} type="password" placeholder={t("f.passwordPh")} error={bad("password")} />
            </div>
          </div>

          <fieldset className="measures">
            <legend className="disp">{t("reg.measures")}</legend>
            <div className="grid4">
              {MEASURES.map((m) => (
                <Field key={m.key} name={m.key} label={t(m.label)} type="number" placeholder={m.ph} error={bad(m.key)} />
              ))}
            </div>
          </fieldset>

          {error && <p className="error" role="alert">{t(error)}</p>}

          <div className="actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? t("reg.busy") : t("reg.submit")}
            </button>
            <span className="muted">
              {t("reg.have")} <Link to="/login" className="link">{t("login.submit")}</Link>
            </span>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field(props: { name: string; label: string; type?: string; placeholder?: string; error?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={props.name} className="lbl">{props.label}</label>
      <input id={props.name} name={props.name} type={props.type ?? "text"} placeholder={props.placeholder} aria-invalid={props.error || undefined} />
    </div>
  );
}
