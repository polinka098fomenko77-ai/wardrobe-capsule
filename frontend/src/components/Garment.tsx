// Малюнок речі (силует у кольорі товару). Показуємо, поки в каталозі немає справжніх фото.
// Відтінки кольорів каталогу (ключі збігаються з кольорами в базі)
export const COLOR_HEX: Record<string, string> = {
  "чорний": "#141416",
  "білий": "#f1f1f2",
  "сірий": "#8a8a90",
  "бежевий": "#d8c7ad",
  "синій": "#2f4268",
  "зелений": "#3f5a47",
};

type Kind = "tee" | "shirt" | "hoodie" | "sweater" | "jacket" | "blazer";

function kindOf(name: string): Kind {
  const n = name.toLowerCase();
  if (n.includes("сорочк")) return "shirt";
  if (n.includes("худі")) return "hoodie";
  if (n.includes("светр")) return "sweater";
  if (n.includes("куртк")) return "jacket";
  if (n.includes("піджак")) return "blazer";
  return "tee";
}

// Світлий чи темний колір, щоб підібрати контрастні лінії деталей
function isDark(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
}

const SHORT = "M72 40 L40 58 L22 98 L50 108 L58 92 L58 226 L142 226 L142 92 L150 108 L178 98 L160 58 L128 40 Q100 64 72 40 Z";
const LONG = "M72 40 L44 52 L22 176 L46 182 L60 100 L60 228 L140 228 L140 100 L154 182 L178 176 L156 52 L128 40 Q100 64 72 40 Z";

export function Garment({ name, color }: { name: string; color: string }) {
  const kind = kindOf(name);
  const line = isDark(color) ? "rgba(255,255,255,.38)" : "rgba(0,0,0,.30)";
  const body = kind === "tee" ? SHORT : LONG;

  return (
    <svg className="garment" viewBox="0 0 200 260" role="img" aria-label={name}>
      {kind === "hoodie" && (
        <path d="M70 42 Q100 0 130 42 Q100 74 70 42 Z" fill={color} stroke={line} strokeWidth="1.6" strokeLinejoin="round" />
      )}
      <path d={body} fill={color} stroke={line} strokeWidth="1.6" strokeLinejoin="round" />

      {kind === "tee" && <path d="M72 40 Q100 64 128 40" fill="none" stroke={line} strokeWidth="3" strokeLinecap="round" />}

      {kind === "shirt" && (
        <g fill="none" stroke={line} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M72 40 L100 74 L128 40 L116 34 L100 52 L84 34 Z" />
          <path d="M100 74 V228" />
          <circle cx="104" cy="104" r="1.8" />
          <circle cx="104" cy="140" r="1.8" />
          <circle cx="104" cy="176" r="1.8" />
          <path d="M70 200 H96 M104 200 H130" strokeDasharray="2 4" />
        </g>
      )}

      {kind === "hoodie" && (
        <g fill="none" stroke={line} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M72 40 Q100 66 128 40" />
          <path d="M92 62 V96 M108 62 V96" />
          <path d="M74 170 H126 L132 214 H68 Z" />
          <path d="M60 216 H140" />
        </g>
      )}

      {kind === "sweater" && (
        <g fill="none" stroke={line} strokeWidth="1.6" strokeLinecap="round">
          <path d="M72 40 Q100 66 128 40" strokeWidth="3.4" />
          <path d="M60 214 H140 M60 220 H140" />
          <path d="M23 168 L45 174 M25 160 L47 166" />
          <path d="M177 168 L155 174 M175 160 L153 166" />
          <path d="M76 100 V206 M88 100 V206 M100 100 V206 M112 100 V206 M124 100 V206" strokeOpacity=".45" />
        </g>
      )}

      {kind === "jacket" && (
        <g fill="none" stroke={line} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M72 40 L92 62 L100 54 L108 62 L128 40" />
          <path d="M100 54 V228" />
          <path d="M74 178 H92 M108 178 H126" />
          <path d="M60 212 H140" />
        </g>
      )}

      {kind === "blazer" && (
        <g fill="none" stroke={line} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M72 40 L100 138 L128 40" />
          <path d="M72 40 L88 66 L74 84 L100 138" />
          <path d="M128 40 L112 66 L126 84 L100 138" />
          <circle cx="100" cy="162" r="2.4" />
          <circle cx="100" cy="190" r="2.4" />
          <path d="M70 196 H90 V214 H70 Z M110 196 H130 V214 H110 Z" />
        </g>
      )}
    </svg>
  );
}