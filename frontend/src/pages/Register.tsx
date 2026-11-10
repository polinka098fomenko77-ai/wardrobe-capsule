import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuth } from "../auth";
import { ApiError } from "../api";

const MEASURES = [
  { key: "heightCm", label: "Зріст", ph: "168" },
  { key: "chestCm", label: "Груди", ph: "88" },
  { key: "waistCm", label: "Талія", ph: "68" },
  { key: "hipsCm", label: "Стегна", ph: "94" },
] as const;

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
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
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.details ?? {});
      } else setError("Невідома помилка");
    } finally {
      setBusy(false);
    }
  }

  const fe = (k: string) => fieldErrors[k]?.[0];

  return (
    <div className="page">
      <Header />
      <main className="split">
        <section className="hero">
          <span className="lbl hero-lbl">Віртуальна примірочна</span>
          <h2 className="disp hero-title">
            Приміряйте <em>вдома.</em> Купуйте впевнено.
          </h2>
          <p className="hero-text">
            Одяг із різних магазинів на вашому власному фото. Мірки потрібні лише для того, щоб підказати розмір.
          </p>
        </section>

        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="steps" aria-hidden="true">
            <span className="on" /><span /><span /><span />
          </div>
          <div>
            <h1 className="disp form-title">Створіть акаунт</h1>
            <p className="muted">Нікнейм і аватарку можна змінити пізніше в профілі.</p>
          </div>

          <div className="grid2">
            <Field name="firstName" label="Ім'я" placeholder="Поліна" error={fe("firstName")} />
            <Field name="lastName" label="Прізвище" placeholder="Фоменко" error={fe("lastName")} />
            <Field name="nickname" label="Нікнейм" placeholder="polina" error={fe("nickname")} />
            <Field name="email" label="Email" type="email" placeholder="name@example.com" error={fe("email")} />
            <div style={{ gridColumn: "span 2" }}>
              <Field name="password" label="Пароль" type="password" placeholder="Щонайменше 8 символів" error={fe("password")} />
            </div>
          </div>

          <fieldset className="measures">
            <legend className="disp">Параметри тіла, <em>см</em></legend>
            <div className="grid4">
              {MEASURES.map((m) => (
                <Field key={m.key} name={m.key} label={m.label} type="number" placeholder={m.ph} error={fe(m.key)} />
              ))}
            </div>
          </fieldset>

          {error && <p className="error" role="alert">{error}</p>}

          <div className="actions">
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Створюємо..." : "Продовжити"}
            </button>
            <span className="muted">
              Вже є акаунт? <Link to="/login" className="link">Увійти</Link>
            </span>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field(props: { name: string; label: string; type?: string; placeholder?: string; error?: string }) {
  return (
    <div className="field">
      <label htmlFor={props.name} className="lbl">{props.label}</label>
      <input id={props.name} name={props.name} type={props.type ?? "text"} placeholder={props.placeholder} />
      {props.error && <span className="field-error">{props.error}</span>}
    </div>
  );
}
