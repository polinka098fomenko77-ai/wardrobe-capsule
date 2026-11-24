import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Header } from "../components/Header";
import { AuthImg } from "../components/AuthImg";
import { Garment, COLOR_HEX } from "../components/Garment";
import { useAuth } from "../auth";
import { api } from "../api";
import { useI18n, type Key } from "../i18n";
import { errorKey } from "../errors";

type Photo = { id: number; createdAt: string; expiresAt: string };
type Saved = { id: number; name: string; store: string; color: string };
type Job = { id: number; status: "PENDING" | "PROCESSING" | "DONE" | "FAILED"; errorText: string | null; hasResult: boolean; provider: string };

export default function TryOnPage() {
  const { itemId } = useParams();
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const [item, setItem] = useState<Saved | null | undefined>(undefined); // undefined: ще вантажимо, null: не знайдено
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [photoId, setPhotoId] = useState<number | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | "">("");

  useEffect(() => {
    if (!user) return;
    api<{ items: Saved[] }>("/wardrobe")
      .then((r) => setItem(r.items.find((x) => String(x.id) === itemId) ?? null))
      .catch(() => setItem(null));
    api<Photo[]>("/photos")
      .then((list) => {
        setPhotos(list);
        if (list.length > 0) setPhotoId(list[0].id);
      })
      .catch(() => setPhotos([]));
  }, [user, itemId]);

  // Поки примірка готується, раз на півтори секунди питаємо сервер про статус
  useEffect(() => {
    if (!job || (job.status !== "PENDING" && job.status !== "PROCESSING")) return;
    const timer = setInterval(() => {
      api<Job>(`/tryons/${job.id}`).then(setJob).catch(() => {});
    }, 1500);
    return () => clearInterval(timer);
  }, [job?.id, job?.status]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (item === null) return <Navigate to="/wardrobe" replace />;

  const start = async () => {
    if (!item || photoId === null) return;
    setBusy(true);
    setError("");
    try {
      setJob(await api<Job>("/tryons", { method: "POST", body: { photoId, itemId: item.id } }));
    } catch (err) {
      setError(errorKey(err, "other"));
    } finally {
      setBusy(false);
    }
  };

  const working = job?.status === "PENDING" || job?.status === "PROCESSING";

  return (
    <div className="page">
      <Header />
      <main className="tryon">
        <section className="card tr-side">
          <div>
            <span className="lbl">{t("tr.step")}</span>
            <h1 className="disp form-title">{t("tr.title")}</h1>
            <p className="muted">{t("tr.sub")}</p>
          </div>

          {item && (
            <div className="tr-item">
              <div className="tr-item-pic">
                <Garment name={item.name} color={COLOR_HEX[item.color] ?? "#999999"} />
              </div>
              <div>
                <b>{item.name}</b>
                <div className="muted">{item.store}</div>
              </div>
            </div>
          )}

          <div className="field">
            <span className="lbl">{t("tr.choosePhoto")}</span>
            {photos && photos.length === 0 ? (
              <div>
                <p className="muted">{t("tr.noPhoto")}</p>
                <Link to="/photo" className="btn2 small">{t("tr.toPhoto")}</Link>
              </div>
            ) : (
              <div className="tr-photos">
                {(photos ?? []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={"tr-thumb" + (photoId === p.id ? " on" : "")}
                    aria-pressed={photoId === p.id}
                    onClick={() => setPhotoId(p.id)}
                  >
                    <AuthImg path={`/photos/${p.id}/file`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="error" role="alert">{t(error)}</p>}

          <div className="actions">
            <button type="button" className="btn" disabled={busy || working || photoId === null || !item} onClick={start}>
              {job ? t("tr.again") : t("tr.start")}
            </button>
            <Link to="/wardrobe" className="link">{t("tr.back")}</Link>
          </div>
        </section>

        <section className="card tr-stage-card">
          <div className="tr-stage">
            {!job && <p className="muted tr-msg">{t("tr.idle")}</p>}
            {working && <p className="muted tr-msg">{t("tr.processing")}</p>}
            {job?.status === "FAILED" && <p className="error tr-msg">{t("tr.failed")}{job.errorText ? `: ${job.errorText}` : ""}</p>}
            {job?.status === "DONE" && job.hasResult && <AuthImg path={`/tryons/${job.id}/result`} alt={t("tr.title")} />}
          </div>
          {job?.status === "DONE" && job.provider === "stub" && <p className="muted">{t("tr.demo")}</p>}
        </section>
      </main>
    </div>
  );
}