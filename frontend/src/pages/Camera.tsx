import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { useAuth } from "../auth";
import { apiUpload } from "../api";
import { useI18n, type Key } from "../i18n";
import { errorKey } from "../errors";
import { analyzeFace, averageBrightness, loadFaceLandmarker, normalizeBrightness, type FaceState } from "../lib/face";

type Light = "low" | "ok" | "high";
type Phase = "starting" | "live" | "review" | "denied" | "nocam";

const lightOf = (m: number): Light => (m < 70 ? "low" : m > 195 ? "high" : "ok");

export default function CameraPage() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const scratchRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const captureRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meanRef = useRef(128);
  const blobRef = useRef<Blob | null>(null);

  const [phase, setPhase] = useState<Phase>("starting");
  const [face, setFace] = useState<FaceState | null>(null); // null = підказки за обличчям недоступні
  const [light, setLight] = useState<Light>("ok");
  const [level, setLevel] = useState(50);
  const [previewUrl, setPreviewUrl] = useState("");
  const [boosted, setBoosted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Key | "">("");
  const [modelOk, setModelOk] = useState(true);
  const [veryDark, setVeryDark] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
  }, []);

  // Увімкнення камери
  const start = useCallback(async () => {
    setError("");
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play().catch(() => {});
      }
      setPhase("live");
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setPhase(name === "NotFoundError" || name === "OverconstrainedError" ? "nocam" : "denied");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void start();
    return stop;
  }, [user, start, stop]);

  // Цикл аналізу: яскравість і поворот голови ~8 разів на секунду
  useEffect(() => {
    if (phase !== "live") return;
    let alive = true;
    let timer: number | undefined;
    let landmarker: Awaited<ReturnType<typeof loadFaceLandmarker>> | null = null;

    loadFaceLandmarker()
      .then((lm) => {
        landmarker = lm;
      })
      .catch(() => alive && setModelOk(false));

    const tick = () => {
      const v = videoRef.current;
      if (alive && v && v.readyState >= 2 && v.videoWidth > 0) {
        const mean = averageBrightness(v, scratchRef.current);
        meanRef.current = mean;
        setLevel(Math.min(100, Math.round((mean / 255) * 100 * 1.6)));
        setLight(lightOf(mean));
        setVeryDark(mean < 40);
        if (landmarker) {
          try {
            const res = landmarker.detectForVideo(v, performance.now());
            setFace(analyzeFace(res.faceLandmarks[0]));
          } catch {
            /* пропускаємо кадр */
          }
        }
      }
      if (alive) timer = window.setTimeout(tick, 120);
    };
    tick();
    return () => {
      alive = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [phase]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  function capture() {
    const v = videoRef.current;
    const c = captureRef.current;
    if (!v || !c || !v.videoWidth) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    // Зберігаємо справжню орієнтацію (не дзеркальну), як на звичайному фото
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    const didBoost = normalizeBrightness(c, meanRef.current);
    setBoosted(didBoost);
    c.toBlob(
      (blob) => {
        if (!blob) return;
        blobRef.current = blob;
        setPreviewUrl(URL.createObjectURL(blob));
        setPhase("review");
        stop();
      },
      "image/jpeg",
      0.92,
    );
  }

  async function save() {
    const blob = blobRef.current;
    if (!blob) return;
    setBusy(true);
    setError("");
    try {
      await apiUpload("/photos", new File([blob], "camera.jpg", { type: "image/jpeg" }));
      navigate("/photo");
    } catch (err) {
      setError(errorKey(err, "other"));
      setBusy(false);
    }
  }

  function retake() {
    setPreviewUrl("");
    blobRef.current = null;
    setFace(null);
    void start();
  }

  // Головна підказка над відео
  let hint: Key = "cam.hint.ok";
  if (veryDark) hint = "cam.hint.dark";
  else if (face) {
    if (!face.found) hint = "cam.hint.noface";
    else if (face.size === "far") hint = "cam.hint.closer";
    else if (face.size === "near") hint = "cam.hint.farther";
    else if (!face.centered) hint = "cam.hint.center";
    else if (face.yaw === "left") hint = "cam.hint.turnLeft";
    else if (face.yaw === "right") hint = "cam.hint.turnRight";
  }
  const ready = hint === "cam.hint.ok";

  const lightLabel: Record<Light, Key> = { low: "cam.light.low", ok: "cam.light.ok", high: "cam.light.high" };
  const live = phase === "live";

  return (
    <div className="page">
      <Header />
      <main className="camera">
        <section className="card cam-view">
          <div className="cam-frame">
            <video ref={videoRef} playsInline muted className={live || phase === "starting" ? "" : "hide"} />
            {phase === "review" && previewUrl && <img src={previewUrl} alt="" className="cam-shot" />}
            {live && (
              <>
                <svg className="cam-oval" viewBox="0 0 100 133" preserveAspectRatio="none" aria-hidden="true">
                  <ellipse cx="50" cy="52" rx="26" ry="34" />
                </svg>
                <span className="cam-live"><i /> LIVE</span>
                <span className={"cam-hint" + (ready ? " good" : "")} role="status" aria-live="polite">{t(hint)}</span>
              </>
            )}
            {phase === "starting" && <div className="cam-msg">{t("cam.starting")}</div>}
            {phase === "denied" && <div className="cam-msg">{t("cam.denied")}</div>}
            {phase === "nocam" && <div className="cam-msg">{t("cam.nocam")}</div>}
          </div>
          <canvas ref={captureRef} hidden />
        </section>

        <aside className="card form cam-side">
          <div>
            <span className="lbl">{t("photo.step")}</span>
            <h1 className="disp form-title">{t("cam.title")}</h1>
            <p className="muted">{t("cam.sub")}</p>
          </div>

          {live && (
            <>
              <div className="meter-row">
                <span className="lbl">{t("cam.light")}</span>
                <b>{t(lightLabel[light])}</b>
              </div>
              <div className="meter" aria-hidden="true"><span style={{ width: `${level}%` }} /></div>

              <ul className="checks">
                <li><span>{t("cam.check.face")}</span><b>{!modelOk ? "—" : face ? (face.found && face.centered && face.size === "ok" ? t("cam.yes") : t("cam.no")) : "…"}</b></li>
                <li><span>{t("cam.check.turn")}</span><b>{!modelOk ? "—" : face?.found ? (face.yaw === "straight" ? t("cam.yes") : t("cam.no")) : "…"}</b></li>
              </ul>
              {!modelOk && <p className="muted">{t("cam.nomodel")}</p>}
            </>
          )}

          {phase === "review" && (
            <p className="muted">{boosted ? t("cam.boosted") : t("cam.reviewOk")}</p>
          )}
          {error && <p className="error" role="alert">{t(error)}</p>}

          <div className="cam-actions">
            {live && <button className="btn" type="button" onClick={capture}>{t("cam.shoot")}</button>}
            {phase === "review" && (
              <>
                <button className="btn" type="button" disabled={busy} onClick={save}>{busy ? t("photo.uploading") : t("cam.save")}</button>
                <button className="btn2" type="button" disabled={busy} onClick={retake}>{t("cam.retake")}</button>
              </>
            )}
            {(phase === "denied" || phase === "nocam") && (
              <button className="btn" type="button" onClick={() => void start()}>{t("cam.retry")}</button>
            )}
            <Link to="/photo" className="btn2">{t("cam.fromFile")}</Link>
          </div>
        </aside>
      </main>
    </div>
  );
}
