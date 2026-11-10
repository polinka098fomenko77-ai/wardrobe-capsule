import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useTheme } from "../theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const choose = (t: "day" | "night") => {
    setTheme(t);
    if (user) updateUser({ theme: t }).catch(() => {});
  };
  return (
    <div className="seg" role="group" aria-label="Тема">
      <button type="button" aria-label="Денна тема" aria-pressed={theme === "day"} onClick={() => choose("day")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
        </svg>
      </button>
      <button type="button" aria-label="Нічна тема" aria-pressed={theme === "night"} onClick={() => choose("night")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
        </svg>
      </button>
    </div>
  );
}

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.34 }} aria-hidden="true">
      {name}
    </span>
  );
}

export function Header() {
  const { user } = useAuth();
  const initials = user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : "";
  return (
    <header className="header">
      <nav className="lbl nav">
        {user ? <Link to="/profile">Профіль</Link> : <Link to="/login">Вхід</Link>}
      </nav>
      <Link to="/" className="logo">Примірочна</Link>
      <div className="header-right">
        <ThemeToggle />
        {user && (
          <Link to="/profile" className="user-chip">
            <Avatar name={initials} />
            <span>@{user.nickname}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
