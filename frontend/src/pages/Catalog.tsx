import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Garment } from "../components/Garment";
import { useAuth } from "../auth";
import { api } from "../api";
import { useI18n, type Key } from "../i18n";
import { errorKey } from "../errors";

type Item = {
  id: number;
  name: string;
  store: string;
  color: string;
  price: number;
  currency: string;
  imageUrl: string;
  productUrl: string;
  sizes: string[];
};
type Meta = { colors: string[]; stores: string[]; sizes: string[]; minPrice: number; maxPrice: number };
type Result = { items: Item[]; total: number; page: number; pages: number };

// Відтінки для кружечків і плиток. Ключі збігаються з кольорами в базі
const COLORS: Record<string, { hex: string; en: string }> = {
  "чорний": { hex: "#141416", en: "Black" },
  "білий": { hex: "#f1f1f2", en: "White" },
  "сірий": { hex: "#8a8a90", en: "Gray" },
  "бежевий": { hex: "#d8c7ad", en: "Beige" },
  "синій": { hex: "#2f4268", en: "Navy" },
  "зелений": { hex: "#3f5a47", en: "Green" },
};

type Filters = { minPrice: string; maxPrice: string; size: string; color: string; store: string; sort: string; page: number };
const EMPTY: Filters = { minPrice: "", maxPrice: "", size: "", color: "", store: "", sort: "price_asc", page: 1 };

export default function CatalogPage() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<Key | "">("");
  const [saved, setSaved] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (user) {
      api<Meta>("/items/meta").then(setMeta).catch(() => {});
      api<{ ids: number[] }>("/wardrobe/ids").then((r) => setSaved(new Set(r.ids))).catch(() => {});
    }
  }, [user]);

  // Запит каталогу при кожній зміні фільтрів (з маленькою паузою, щоб не слати запит на кожну цифру)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const params = new URLSearchParams();
    if (filters.minPrice) params.set("minPrice", filters.minPrice);
    if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
    if (filters.size) params.set("size", filters.size);
    if (filters.color) params.set("color", filters.color);
    if (filters.store) params.set("store", filters.store);
    params.set("sort", filters.sort);
    params.set("page", String(filters.page));
    const timer = setTimeout(() => {
      api<Result>(`/items?${params.toString()}`)
        .then((r) => {
          if (!cancelled) {
            setData(r);
            setError("");
          }
        })
        .catch((err) => {
          if (!cancelled) setError(errorKey(err, "other"));
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user, filters]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, page: 1, ...patch }));
  const colorLabel = (c: string) => (lang === "uk" ? c : COLORS[c]?.en ?? c);
  const money = (n: number, cur: string) =>
    `${n.toLocaleString(lang === "uk" ? "uk-UA" : "en-GB")} ${cur === "UAH" && lang === "uk" ? "грн" : cur}`;

  // Додати річ у гардероб або прибрати її звідти
  const toggleSaved = async (id: number) => {
    const has = saved.has(id);
    try {
      await api(has ? `/wardrobe/${id}` : "/wardrobe", has ? { method: "DELETE" } : { method: "POST", body: { itemId: id } });
      setSaved((s) => {
        const n = new Set(s);
        if (has) n.delete(id);
        else n.add(id);
        return n;
      });
    } catch (err) {
      setError(errorKey(err, "other"));
    }
  };

  return (
    <div className="page">
      <Header />
      <main className="catalog">
        <aside className="card filters">
          <div>
            <span className="lbl">{t("cat.step")}</span>
            <h1 className="disp form-title">{t("cat.title")}</h1>
            <p className="muted">{t("cat.sub")}</p>
          </div>

          <div className="field">
            <span className="lbl">{t("cat.price")}</span>
            <div className="grid2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder={meta ? `${t("cat.from")} ${meta.minPrice}` : t("cat.from")}
                value={filters.minPrice}
                onChange={(e) => set({ minPrice: e.target.value })}
                aria-label={t("cat.from")}
              />
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder={meta ? `${t("cat.to")} ${meta.maxPrice}` : t("cat.to")}
                value={filters.maxPrice}
                onChange={(e) => set({ maxPrice: e.target.value })}
                aria-label={t("cat.to")}
              />
            </div>
          </div>

          <div className="field">
            <span className="lbl">{t("cat.size")}</span>
            <div className="chips">
              {(meta?.sizes ?? []).map((s) => (
                <button
                  key={s}
                  type="button"
                  className={"chip" + (filters.size === s ? " on" : "")}
                  aria-pressed={filters.size === s}
                  onClick={() => set({ size: filters.size === s ? "" : s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="lbl">{t("cat.color")}</span>
            <div className="swatches">
              {(meta?.colors ?? []).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={"swatch" + (filters.color === c ? " on" : "")}
                  style={{ background: COLORS[c]?.hex ?? "#999" }}
                  title={colorLabel(c)}
                  aria-label={colorLabel(c)}
                  aria-pressed={filters.color === c}
                  onClick={() => set({ color: filters.color === c ? "" : c })}
                />
              ))}
            </div>
          </div>

          <div className="field">
            <span className="lbl">{t("cat.store")}</span>
            <select value={filters.store} onChange={(e) => set({ store: e.target.value })}>
              <option value="">{t("cat.all")}</option>
              {(meta?.stores ?? []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <span className="lbl">{t("cat.sort")}</span>
            <select value={filters.sort} onChange={(e) => set({ sort: e.target.value })}>
              <option value="price_asc">{t("cat.sort.priceAsc")}</option>
              <option value="price_desc">{t("cat.sort.priceDesc")}</option>
              <option value="new">{t("cat.sort.new")}</option>
            </select>
          </div>

          <button className="btn2" type="button" onClick={() => setFilters(EMPTY)}>{t("cat.reset")}</button>
          <p className="muted">{t("cat.onlyAvailable")}</p>
        </aside>

        <section className="results">
          <div className="results-head">
            <span className="lbl">{t("cat.found")}: {data?.total ?? "…"}</span>
          </div>
          {error && <p className="error" role="alert">{t(error)}</p>}
          {data && data.items.length === 0 && <p className="muted">{t("cat.empty")}</p>}
          <div className="item-grid">
            {(data?.items ?? []).map((it) => (
              <article className="item-card" key={it.id}>
            <div className="item-tile">
                  {it.imageUrl ? (
                    <img src={it.imageUrl} alt={it.name} />
                  ) : (
                    <Garment name={it.name} color={COLORS[it.color]?.hex ?? "#999999"} />
                  )}
                  <span className="item-store">{it.store}</span>
                  <button
                    type="button"
                    className={"heart" + (saved.has(it.id) ? " on" : "")}
                    aria-pressed={saved.has(it.id)}
                    aria-label={t(saved.has(it.id) ? "wd.remove" : "wd.add")}
                    title={t(saved.has(it.id) ? "wd.remove" : "wd.add")}
                    onClick={() => toggleSaved(it.id)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={saved.has(it.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s-7-4.4-9.3-9A5.3 5.3 0 0112 6.6 5.3 5.3 0 0121.3 12C19 16.6 12 21 12 21z" />
                    </svg>
                  </button>
                </div>
                <div className="item-info">
                  <b>{it.name}</b>
                  <span className="item-price">{money(it.price, it.currency)}</span>
                  <span className="muted item-sizes">{it.sizes.join(" · ")}</span>
                </div>
              </article>
            ))}
          </div>

          {data && data.pages > 1 && (
            <div className="pager">
              <button className="btn2 small" type="button" disabled={data.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                {t("cat.prev")}
              </button>
              <span className="muted">{data.page} / {data.pages}</span>
              <button className="btn2 small" type="button" disabled={data.page >= data.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                {t("cat.next")}
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}