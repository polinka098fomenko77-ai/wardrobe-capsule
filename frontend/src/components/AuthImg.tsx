import { useEffect, useState } from "react";
import { apiBlobUrl } from "../api";

// Показує приватну картинку: завантажує її з токеном і робить тимчасове посилання
export function AuthImg({ path, alt = "" }: { path: string; alt?: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let url: string | undefined;
    let cancelled = false;
    setSrc(undefined);
    apiBlobUrl(path)
      .then((u) => {
        url = u;
        if (!cancelled) setSrc(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);
  return src ? <img src={src} alt={alt} /> : <div className="photo-skeleton" />;
}