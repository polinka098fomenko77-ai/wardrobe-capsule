import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Header, Avatar } from "../components/Header";
import { useAuth } from "../auth";
import { api } from "../api";
import { useI18n, type Key } from "../i18n";
import { errorKey } from "../errors";

// Невеликий стан для кожної форми: успіх / помилка
function useStatus() {
  const [ok, setOk] = useState<Key | "">("");
  const [error, setError] = useState<Key | "">("");
  return { ok, error, setOk, setError };
}

function Status({ s }: { s: ReturnType<typeof useStatus> }) {
  const { t } = useI18n();
  return (
    <>
      {s.error && <p className="error" role="alert">{t(s.error)}</p>}
      {s.ok && <p className="ok">{t(s.ok)}</p>}
    </>
  );
}

export default function Profile() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const initials = (user.firstName[0] + user.lastName[0]).toUpperCase();

  return (
    <div className="page">
      <Header />
      <main className="profile">
        <section className="card form">
          <div>
            <span className="lbl">{t("profile.label")}</span>
            <h1 className="disp form-title">{t("profile.title")}</h1>
          </div>
          <div className="avatar-row">
            <Avatar name={initials} size={104} />
            <span className="muted">{t("profile.avatarNote")}</span>
          </div>
          <AccountForm />
        </section>

        <div className="col">
          <MeasuresForm />
          <PasswordForm />
        </div>
      </main>
    </div>
  );
}

function AccountForm() {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const st = useStatus();
  if (!user) return null;

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    st.setOk("");
    st.setError("");
    try {
      await updateUser({
        nickname: String(f.get("nickname")).trim(),
        firstName: String(f.get("firstName")).trim(),
        lastName: String(f.get("lastName")).trim(),
        email: String(f.get("email")).trim(),
      });
      st.setOk("profile.saved");
    } catch (err) {
      st.setError(errorKey(err, "other"));
    }
  }

  return (
    <form className="form-inner" onSubmit={onSave} key={[user.nickname, user.firstName, user.lastName, user.email].join("|")}>
      <span className="lbl">{t("profile.account")}</span>
      <div className="field">
        <label htmlFor="nickname" className="lbl">{t("f.nickname")}</label>
        <input id="nickname" name="nickname" defaultValue={user.nickname} />
      </div>
      <div className="grid2">
        <div className="field">
          <label htmlFor="firstName" className="lbl">{t("f.firstName")}</label>
          <input id="firstName" name="firstName" defaultValue={user.firstName} />
        </div>
        <div className="field">
          <label htmlFor="lastName" className="lbl">{t("f.lastName")}</label>
          <input id="lastName" name="lastName" defaultValue={user.lastName} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="email" className="lbl">{t("f.email")}</label>
        <input id="email" name="email" type="email" defaultValue={user.email} />
      </div>
      <Status s={st} />
      <div className="actions">
        <button className="btn" type="submit">{t("profile.save")}</button>
      </div>
    </form>
  );
}

const MEASURES: { key: "heightCm" | "chestCm" | "waistCm" | "hipsCm"; label: Key }[] = [
  { key: "heightCm", label: "f.height" },
  { key: "chestCm", label: "f.chest" },
  { key: "waistCm", label: "f.waist" },
  { key: "hipsCm", label: "f.hips" },
];

function MeasuresForm() {
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const st = useStatus();
  if (!user) return null;

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    st.setOk("");
    st.setError("");
    try {
      await updateUser({
        heightCm: Number(f.get("heightCm")),
        chestCm: Number(f.get("chestCm")),
        waistCm: Number(f.get("waistCm")),
        hipsCm: Number(f.get("hipsCm")),
      });
      st.setOk("profile.saved");
    } catch (err) {
      st.setError(errorKey(err, "other"));
    }
  }

  return (
    <form className="card side" onSubmit={onSave} key={MEASURES.map((m) => user[m.key]).join("|")}>
      <span className="lbl">{t("profile.measures")}</span>
      <div className="grid2">
        {MEASURES.map((m) => (
          <div className="field" key={m.key}>
            <label htmlFor={m.key} className="lbl">{t(m.label)}</label>
            <input id={m.key} name={m.key} type="number" defaultValue={user[m.key]} />
          </div>
        ))}
      </div>
      <Status s={st} />
      <div className="actions">
        <button className="btn" type="submit">{t("profile.save")}</button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const { t } = useI18n();
  const st = useStatus();

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    st.setOk("");
    st.setError("");
    try {
      await api("/me/password", {
        method: "POST",
        body: { currentPassword: String(f.get("currentPassword")), newPassword: String(f.get("newPassword")) },
      });
      form.reset();
      st.setOk("profile.passwordChanged");
    } catch (err) {
      st.setError(errorKey(err, "password"));
    }
  }

  return (
    <form className="card side" onSubmit={onSave}>
      <span className="lbl">{t("profile.password")}</span>
      <div className="field">
        <label htmlFor="currentPassword" className="lbl">{t("f.currentPassword")}</label>
        <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" />
      </div>
      <div className="field">
        <label htmlFor="newPassword" className="lbl">{t("f.newPassword")}</label>
        <input id="newPassword" name="newPassword" type="password" placeholder={t("f.passwordPh")} autoComplete="new-password" />
      </div>
      <Status s={st} />
      <div className="actions">
        <button className="btn" type="submit">{t("profile.save")}</button>
      </div>
    </form>
  );
}
