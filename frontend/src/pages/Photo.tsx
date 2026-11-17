import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Navigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuth } from "../auth";
import { api, apiBlobUrl, apiUpload } from "../api";
import { useI18n, type Key } from "../i18n";
import { errorKey } from "../errors";

type Photo = { id: number; createdAt: string; expiresAt: string };

// Показує приватне фото: завантажує його з токеном і робить тимчасове посилання
function AuthImage({ id }: { id: number }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let url: string | undefined;
    let cancelled = false;
    apiBlobUrl(`/photos/${id}/file`)
      .then((u) => {
        url = u;
        if (!cancelled) setSrc(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);
  return src ? <img src={src} alt="" /> : <div className="photo-skeleton" />;
}

export default function PhotoPage() {
  const { user, loading } = useAuth();
  const { t, lang } = useI18n();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | "">("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) api<Photo[]>("/photos").then(setPhotos).catch(() => {});
  }, [user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const p = await apiUpload<Photo>("/photos", file);
      setPhotos((prev) => [p, ...prev]);
    } catch (err) {
      setError(errorKey(err, "other"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    try {
      await api(`/photos/${id}`, { method: "DELETE" });
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(errorKey(err, "other"));
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(lang === "uk" ? "uk-UA" : "en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="page">
      <Header />
      <main className="profile">
        <section className="card form">
          <div className="steps" aria-hidden="true">
            <span className="on" /><span className="on" /><span /><span />
          </div>
          <div>
            <span className="lbl">{t("photo.step")}</span>
            <h1 className="disp form-title">{t("photo.title")}</h1>
            <p className="muted">{t("photo.sub")}</p>
          </div>

          <ul className="tips">
            <li>{t("photo.tip1")}</li>
            <li>{t("photo.tip2")}</li>
            <li>{t("photo.tip3")}</li>
            <li>{t("photo.tip4")}</li>
          </ul>

          <div className="dropzone">
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
            <button className="btn" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
              {busy ? t("photo.uploading") : t("photo.upload")}
            </button>
            <span className="muted">{t("photo.formats")}</span>
          </div>
          {error && <p className="error" role="alert">{t(error)}</p>}
          <p className="muted">{t("photo.camera")}</p>
        </section>

        <section className="card side">
          <span className="lbl">{t("photo.mine")}</span>
          {photos.length === 0 ? (
            <p className="muted">{t("photo.empty")}</p>
          ) : (
            <div className="photo-grid">
              {photos.map((p) => (
                <figure className="photo-card" key={p.id}>
                  <div className="photo-frame"><AuthImage id={p.id} /></div>
                  <figcaption>
                    <span className="muted">{t("photo.expires")}: {fmt(p.expiresAt)}</span>
                    <button className="btn2 small" type="button" onClick={() => remove(p.id)}>{t("photo.delete")}</button>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
