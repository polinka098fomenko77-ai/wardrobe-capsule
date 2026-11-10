import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "uk" | "en";

const dict = {
  uk: {
    brand: "Примірочна",
    "nav.login": "Вхід",
    "menu.profile": "Налаштування профілю",
    "menu.theme": "Тема",
    "menu.language": "Мова",
    "menu.logout": "Вийти",
    "theme.day": "День",
    "theme.night": "Ніч",
    "hero.label": "Віртуальна примірочна",
    "hero.title1": "Приміряйте",
    "hero.title2": "вдома.",
    "hero.title3": "Купуйте впевнено.",
    "hero.text": "Одяг із різних магазинів на вашому власному фото. Мірки потрібні лише для того, щоб підказати розмір.",
    "reg.title": "Створіть акаунт",
    "reg.sub": "Нікнейм і аватарку можна змінити пізніше в профілі.",
    "reg.measures": "Параметри тіла, см",
    "reg.submit": "Продовжити",
    "reg.busy": "Створюємо...",
    "reg.have": "Вже є акаунт?",
    "f.firstName": "Ім'я",
    "f.lastName": "Прізвище",
    "f.nickname": "Нікнейм",
    "f.email": "Email",
    "f.password": "Пароль",
    "f.passwordPh": "Щонайменше 8 символів",
    "f.height": "Зріст",
    "f.chest": "Груди",
    "f.waist": "Талія",
    "f.hips": "Стегна",
    "login.title": "З поверненням",
    "login.sub": "Увійдіть, щоб продовжити примірку.",
    "login.submit": "Увійти",
    "login.busy": "Входимо...",
    "login.none": "Немає акаунта?",
    "login.register": "Зареєструватися",
    "profile.label": "Налаштування профілю",
    "profile.title": "Ваш образ у сервісі",
    "profile.avatarNote": "Завантаження власної аватарки додамо на наступному кроці.",
    "profile.save": "Зберегти",
    "profile.saved": "Збережено",
    "profile.measures": "Мірки, см",
    "profile.account": "Особисті дані",
    "profile.password": "Зміна пароля",
    "profile.passwordChanged": "Пароль змінено",
    "f.currentPassword": "Поточний пароль",
    "f.newPassword": "Новий пароль",
    "err.currentPassword": "Поточний пароль невірний",
    "err.login": "Невірний email або пароль",
    "err.taken": "Email або нікнейм уже зайняті",
    "err.invalid": "Перевірте введені дані",
    "err.field": "Перевірте це поле",
    "err.server": "Сервер недоступний. Перевірте, що backend запущено.",
    "err.unknown": "Щось пішло не так",
  },
  en: {
    brand: "Primirochna",
    "nav.login": "Log in",
    "menu.profile": "Profile settings",
    "menu.theme": "Theme",
    "menu.language": "Language",
    "menu.logout": "Log out",
    "theme.day": "Day",
    "theme.night": "Night",
    "hero.label": "Virtual fitting room",
    "hero.title1": "Try it on",
    "hero.title2": "at home.",
    "hero.title3": "Buy with confidence.",
    "hero.text": "Clothes from different stores on your own photo. Measurements are only used to suggest your size.",
    "reg.title": "Create an account",
    "reg.sub": "You can change your nickname and avatar later in your profile.",
    "reg.measures": "Body measurements, cm",
    "reg.submit": "Continue",
    "reg.busy": "Creating...",
    "reg.have": "Already have an account?",
    "f.firstName": "First name",
    "f.lastName": "Last name",
    "f.nickname": "Nickname",
    "f.email": "Email",
    "f.password": "Password",
    "f.passwordPh": "At least 8 characters",
    "f.height": "Height",
    "f.chest": "Chest",
    "f.waist": "Waist",
    "f.hips": "Hips",
    "login.title": "Welcome back",
    "login.sub": "Log in to continue your fitting.",
    "login.submit": "Log in",
    "login.busy": "Logging in...",
    "login.none": "No account yet?",
    "login.register": "Sign up",
    "profile.label": "Profile settings",
    "profile.title": "Your look in the app",
    "profile.avatarNote": "Custom avatar upload will be added in the next step.",
    "profile.save": "Save",
    "profile.saved": "Saved",
    "profile.measures": "Measurements, cm",
    "profile.account": "Personal details",
    "profile.password": "Change password",
    "profile.passwordChanged": "Password changed",
    "f.currentPassword": "Current password",
    "f.newPassword": "New password",
    "err.currentPassword": "Current password is wrong",
    "err.login": "Wrong email or password",
    "err.taken": "Email or nickname is already taken",
    "err.invalid": "Please check the entered data",
    "err.field": "Please check this field",
    "err.server": "Server is unavailable. Make sure the backend is running.",
    "err.unknown": "Something went wrong",
  },
} as const;

export type Key = keyof (typeof dict)["uk"];

const I18nContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string } | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("lang") === "en" ? "en" : "uk"));
  const setLang = (l: Lang) => {
    localStorage.setItem("lang", l);
    document.documentElement.lang = l;
    setLangState(l);
  };
  const t = (k: Key) => dict[lang][k];
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
