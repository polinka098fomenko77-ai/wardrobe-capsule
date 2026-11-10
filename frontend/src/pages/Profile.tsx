import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Header, Avatar } from "../components/Header";
import { useAuth } from "../auth";
import { ApiError } from "../api";

export default function Profile() {
  const { user, loading, updateUser, logout } = useAuth();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const initials = (user.firstName[0] + user.lastName[0]).toUpperCase();

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setMsg("");
    setError("");
    try {
      await updateUser({
        nickname: String(f.get("nickname")).trim(),
        firstName: String(f.get("firstName")).trim(),
        lastName: String(f.get("lastName")).trim(),
      });
      setMsg("Збережено");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Помилка збереження");
    }
  }

  return (
    <div className="page">
      <Header />
      <main className="split">
        <section className="form">
          <div>
            <span className="lbl">Профіль</span>
            <h1 className="disp form-title">Ваш <em>образ</em> у сервісі</h1>
          </div>
          <div className="avatar-row">
            <Avatar name={initials} size={120} />
            <span className="muted">Завантаження власної аватарки додамо на наступному кроці.</span>
          </div>
          <form className="form-inner" onSubmit={onSave} key={user.nickname + user.firstName + user.lastName}>
            <div className="field">
              <label htmlFor="nickname" className="lbl">Нікнейм</label>
              <input id="nickname" name="nickname" defaultValue={user.nickname} />
            </div>
            <div className="grid2">
              <div className="field">
                <label htmlFor="firstName" className="lbl">Ім'я</label>
                <input id="firstName" name="firstName" defaultValue={user.firstName} />
              </div>
              <div className="field">
                <label htmlFor="lastName" className="lbl">Прізвище</label>
                <input id="lastName" name="lastName" defaultValue={user.lastName} />
              </div>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            {msg && <p className="ok">{msg}</p>}
            <div className="actions">
              <button className="btn" type="submit">Зберегти</button>
              <button className="btn2" type="button" onClick={logout}>Вийти</button>
            </div>
          </form>
        </section>

        <aside className="side">
          <span className="lbl">Мірки, см</span>
          <dl className="measure-list">
            <div><dt className="lbl">Зріст</dt><dd className="disp">{user.heightCm}</dd></div>
            <div><dt className="lbl">Груди</dt><dd className="disp">{user.chestCm}</dd></div>
            <div><dt className="lbl">Талія</dt><dd className="disp">{user.waistCm}</dd></div>
            <div><dt className="lbl">Стегна</dt><dd className="disp">{user.hipsCm}</dd></div>
          </dl>
          <p className="muted">{user.email}</p>
        </aside>
      </main>
    </div>
  );
}
