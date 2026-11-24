import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Garment, COLOR_HEX } from "../components/Garment";
import { useAuth } from "../auth";
import { api } from "../api";
import { useI18n, type Key } from "../i18n";
import { errorKey } from "../errors";

type Saved = {
  id: number;
  name: string;
  store: string;
  color: string;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  sizes: string[];
  isAvailable: boolean;
};

export default function WardrobePage() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const [items, setItems] = useState<Saved[] | null>(null);
  const [error, setError] = useState<Key | "">("");

  useEffect(() => {
    if (!user) return;
    api<{ items: Saved[] }>("/wardrobe")
      .then((r) => setItems(r.items))
      .catch((err) => setError(errorKey(err, "other")));
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const money = (n: number, cur: string) =>
    `${n.toLocaleString(lang === "uk" ? "uk-UA" : "en-GB")} ${cur === "UAH" && lang === "uk" ? "грн" : cur}`;

  const remove = async (id: number) => {
    try {
      await api(`/wardrobe/${id}`, { method: "DELETE" });
      setItems((list) => (list ? list.filter((x) => x.id !== id) : list));
    } catch (err) {
      setError(errorKey(err, "other"));
    }
  };

  return (
    <div className="page">
      <Header />
      <main className="wardrobe">
        <section className="card wd-head">
          <span className="lbl">{t("wd.step")}</span>
          <h1 className="disp form-title">{t("wd.title")}</h1>
          <p className="muted">{t("wd.sub")}</p>
        </section>

        {error && <p className="error" role="alert">{t(error)}</p>}

        {items && items.length === 0 && (
          <section className="card wd-head">
            <p className="muted">{t("wd.empty")}</p>
            <div>
              <Link to="/catalog" className="btn">{t("wd.toCatalog")}</Link>
            </div>
          </section>
        )}

        <div className="item-grid">
          {(items ?? []).map((it) => (
            <article className="item-card" key={it.id}>
              <div className={"item-tile" + (it.isAvailable ? "" : " off")}>
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.name} />
                ) : (
                  <Garment name={it.name} color={COLOR_HEX[it.color] ?? "#999999"} />
                )}
                <span className="item-store">{it.store}</span>
                {!it.isAvailable && <span className="item-off">{t("wd.unavailable")}</span>}
              </div>
              <div className="item-info">
                <b>{it.name}</b>
                <span className="item-price">{money(it.price, it.currency)}</span>
                <span className="muted item-sizes">{it.sizes.join(" · ")}</span>
                <Link to={`/tryon/${it.id}`} className="btn small">{t("wd.tryOn")}</Link>
                <button type="button" className="btn2 small" onClick={() => remove(it.id)}>
                  {t("wd.remove")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}