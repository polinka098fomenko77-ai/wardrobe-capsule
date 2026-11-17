import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useTheme } from "../theme";
import { useI18n } from "../i18n";
import { avatarUrl } from "../api";

export function Avatar({ name, size = 36, src }: { name: string; size?: number; src?: string }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {src ? <img src={src} alt="" /> : name}
    </span>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const { t } = useI18n();
  const choose = (v: "day" | "night") => {
    setTheme(v);
    if (user) updateUser({ theme: v }).catch(() => {});
  };
  return (
    <div className="seg" role="group" aria-label={t("menu.theme")}>
      <button type="button" aria-pressed={theme === "day"} onClick={() => choose("day")}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5" />
        </svg>
        {t("theme.day")}
      </button>
      <button type="button" aria-pressed={theme === "night"} onClick={() => choose("night")}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />
        </svg>
        {t("theme.night")}
      </button>
    </div>
  );
}

function LangToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="seg" role="group" aria-label={t("menu.language")}>
      <button type="button" aria-pressed={lang === "uk"} onClick={() => setLang("uk")}>UA</button>
      <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button>
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Закриваємо меню кліком поза ним
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!user) return null;
  const initials = (user.firstName[0] + user.lastName[0]).toUpperCase();

  return (
    <div className="menu" ref={ref}>
      <button type="button" className="user-chip" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <Avatar name={initials} size={34} src={avatarUrl(user)} />
        <span>@{user.nickname}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="menu-panel" role="menu">
          <div className="menu-head">
            <Avatar name={initials} size={44} src={avatarUrl(user)} />
            <div>
              <div className="menu-name">{user.firstName} {user.lastName}</div>
              <div className="muted">{user.email}</div>
            </div>
          </div>
          <Link to="/profile" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
            </svg>
            {t("menu.profile")}
          </Link>
          <Link to="/photo" role="menuitem" className="menu-item" onClick={() => setOpen(false)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {t("menu.photo")}
          </Link>
          <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); logout(); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            {t("menu.logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { user } = useAuth();
  const { t } = useI18n();
  return (
    <header className="header">
      <Link to="/" className="logo">{t("brand")}</Link>
      <div className="header-right">
        <LangToggle />
        <ThemeToggle />
        {user ? <UserMenu /> : <Link to="/login" className="btn2 small">{t("nav.login")}</Link>}
      </div>
    </header>
  );
}
