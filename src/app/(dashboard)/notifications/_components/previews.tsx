import type { CSSProperties, ReactNode } from "react";

/**
 * Faithful iOS-26 notification + lock-screen mirrors for the dashboard.
 *
 * Key to realism: everything inside a preview renders in the **actual San
 * Francisco** system font via the `-apple-system` stack (the dashboard is
 * viewed on a Mac, so this is the real Apple typeface), and the notification
 * platter is a true frosted material (`backdrop-filter` blur over the
 * wallpaper). Colours are literal iOS values, not dashboard tokens.
 *
 * 2026-08-28 fidelity pass against the shipping app:
 *   • The app icon is the flat two-tone GLOBE (#070A10 tile · #1B2D42 sphere ·
 *     #7DE0B0 land) — the old mint-gradient golf-flag squircle never shipped.
 *   • The inbox row mirrors `NotificationRow` as it renders today: rows sit
 *     directly on the canvas (no card), a 40pt glyph tile (accent @14%,
 *     radius 12), the age inline after the headline ("now" at 12px), a quoted
 *     subline in the editorial italic, and an 8px mint unread dot with glow.
 */

const SF: CSSProperties = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", system-ui, sans-serif',
  WebkitFontSmoothing: "antialiased",
};

// A realistic iOS wallpaper (deep dusk gradient) with a subtle bottom vignette
// so notifications read legibly - the way iOS darkens behind them.
const WALLPAPER =
  "radial-gradient(120% 80% at 50% 0%, rgba(255,255,255,0.10), transparent 60%)," +
  "linear-gradient(160deg, #3a2b62 0%, #25315f 38%, #18233f 70%, #0c1020 100%)";

function stripStars(s: string): string {
  return s.replace(/\*/g, "");
}

/** Render `*bold*` segments as bold (for the in-app inbox surface only). */
function boldSegments(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  let bold = false;
  s.split("*").forEach((seg, i) => {
    if (seg) out.push(bold ? <strong key={i} style={{ fontWeight: 600 }}>{seg}</strong> : <span key={i}>{seg}</span>);
    bold = !bold;
  });
  return out;
}

/**
 * The Vestige app icon — the flat two-tone globe, decoded from the shipping
 * icon-1024.png: #070A10 tile, #1B2D42 sphere (~88% of the tile), #7DE0B0
 * landmasses. No gradient, no bevel, no flag. The land shapes are a close
 * hand-trace of the icon's Britain-forward hemisphere.
 */
export function VestigeAppIcon({ size = 40 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.2237),
        background: "#070A10",
        boxShadow: "inset 0 0 0 0.5px rgba(255,255,255,0.10), 0 1px 2px rgba(0,0,0,0.2)",
        flexShrink: 0,
      }}
      className="flex items-center justify-center"
      aria-hidden
    >
      <svg width={size * 0.88} height={size * 0.88} viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="44" fill="#1B2D42" />
        {/* Britain + Ireland, simplified */}
        <path
          d="M52 18 C56 16 60 19 59 24 L63 30 C66 35 64 40 60 43 L61 50 C62 56 58 61 53 62 L49 58 C46 54 47 49 49 45 L46 38 C44 32 46 25 50 22 Z"
          fill="#7DE0B0"
        />
        <path d="M39 44 C43 42 46 45 45 49 C44 53 40 55 37 52 C35 49 36 45 39 44 Z" fill="#7DE0B0" />
        {/* Continental edge, lower right */}
        <path
          d="M66 56 C72 54 78 58 78 64 C78 70 72 75 66 73 C61 71 60 65 62 61 Z"
          fill="#7DE0B0"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}

/** The bare notification platter (frosted material). Sits over a wallpaper. */
function NotificationPlatter({ title, body, time }: { title: string; body: string; time: string }) {
  return (
    <div
      style={{
        ...SF,
        background: "rgba(244,244,247,0.58)",
        backdropFilter: "blur(22px) saturate(180%)",
        WebkitBackdropFilter: "blur(22px) saturate(180%)",
        borderRadius: 24,
        boxShadow: "inset 0 0.5px 0 rgba(255,255,255,0.5), 0 6px 22px rgba(0,0,0,0.22)",
      }}
      className="flex gap-2.5 px-3 py-2.5"
    >
      <VestigeAppIcon size={38} />
      <div className="min-w-0 flex-1" style={{ paddingTop: 1 }}>
        <div className="flex items-baseline justify-between gap-2">
          <p style={{ fontSize: 15, fontWeight: 600, color: "#000", lineHeight: 1.2 }} className="truncate">
            {/* No title set → iOS shows the app name. */}
            {stripStars(title) || "Vestige"}
          </p>
          <span style={{ fontSize: 12.5, color: "rgba(0,0,0,0.42)", fontWeight: 400 }} className="shrink-0">
            {time}
          </span>
        </div>
        {stripStars(body) && (
          <p style={{ fontSize: 14.5, color: "rgba(0,0,0,0.82)", lineHeight: 1.32 }} className="mt-px line-clamp-4">
            {stripStars(body)}
          </p>
        )}
      </div>
    </div>
  );
}

/** A notification banner on a slice of wallpaper - for cards/thumbnails. */
export function IOSNotification({ title, body, time = "now" }: { title: string; body: string; time?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl p-2.5" style={{ background: WALLPAPER }}>
      <NotificationPlatter title={title} body={body} time={time} />
    </div>
  );
}

/**
 * The in-app inbox row, mirroring `NotificationRow` (NotificationInboxRows.swift)
 * as it ships today: on-canvas (no card chrome), 40pt glyph tile at accent@14%
 * radius 12, headline at 14px with the inline age suffix, quoted sublines in
 * the Manrope editorial italic, 8px unread dot with a mint glow. Rendered on a
 * slice of the app's #070A10 canvas with the 52pt-inset hairline beneath, so
 * the row reads in its real context.
 */
export function VestigeInboxRow({
  title,
  body,
  icon,
  unread = true,
}: {
  title: string;
  body: string;
  icon?: ReactNode;
  unread?: boolean;
}) {
  const cleanBody = stripStars(body);
  const isQuote = cleanBody.startsWith("“") || cleanBody.startsWith('"');
  return (
    <div className="overflow-hidden rounded-2xl px-3 pt-1" style={{ background: "#070A10" }}>
      <div className="flex items-center gap-3 py-[11px]" style={SF}>
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(91,228,195,0.14)", color: "#5BE4C3" }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p style={{ fontSize: 14, color: "#F2EFE6", lineHeight: 1.35 }} className="line-clamp-2">
            {title.trim() ? boldSegments(title) : "Vestige"}
            <span style={{ fontSize: 12, fontWeight: 500, color: "#66717E" }}>{"  now"}</span>
          </p>
          {cleanBody && (
            <p
              style={
                isQuote
                  ? {
                      fontFamily: "Manrope, system-ui, sans-serif",
                      fontStyle: "italic",
                      fontSize: 13,
                      color: "#9DA9B6",
                      lineHeight: 1.35,
                    }
                  : { fontSize: 12, fontWeight: 500, color: "#9DA9B6", lineHeight: 1.35 }
              }
              className={isQuote ? "mt-0.5 line-clamp-2" : "mt-0.5 line-clamp-1"}
            >
              {cleanBody}
            </p>
          )}
        </div>
        {unread && (
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: "#5BE4C3", boxShadow: "0 0 8px rgba(91,228,195,0.6)" }}
          />
        )}
      </div>
      {/* The list divider - 52pt leading inset (40 tile + 12 gap), like the app. */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.10)", marginLeft: 52 }} />
    </div>
  );
}
