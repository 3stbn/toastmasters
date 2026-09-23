/**
 * The whiteboard. Elements arrive from the session already positioned
 * (0..1); this component draws them as big emojis that pop in, handwritten
 * labels in the chosen marker colour, arrows between consecutive elements,
 * and photos as polaroids.
 */
import { DOODLES, MARKERS } from "@shared/doodles";
import type { CanvasElement, SessionState } from "@shared/session";

const W = 1920;
const H = 1080;
const EMOJI_PX: Record<1 | 2 | 3, number> = { 1: 92, 2: 124, 3: 168 };
const PAPER = "#f6f1e6";
const EMOJI_BY_ID = new Map(DOODLES.map((d) => [d.id, d.emoji]));

function markerColor(id: string): string {
  return MARKERS.find((m) => m.id === id)?.color ?? "#1f1a17";
}

/** A wobbly hand-drawn arrow from a to b (canvas px). */
function Arrow({ from, to, color, seed }: { from: CanvasElement; to: CanvasElement; color: string; seed: number }) {
  const ax = from.x * W;
  const ay = from.y * H;
  const bx = to.x * W;
  const by = to.y * H;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  const pad = 0.3;
  const sx = ax + dx * pad;
  const sy = ay + dy * pad;
  const ex = bx - dx * pad;
  const ey = by - dy * pad;
  const nx = -dy / len;
  const ny = dx / len;
  const bend = ((seed % 7) - 3) * 14;
  const cx = (sx + ex) / 2 + nx * bend;
  const cy = (sy + ey) / 2 + ny * bend;
  const ang = Math.atan2(ey - cy, ex - cx);
  const head = 16;
  return (
    <g style={{ color }}>
      <path d={`M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <path
        d={`M ${ex - head * Math.cos(ang - 0.5)} ${ey - head * Math.sin(ang - 0.5)} L ${ex} ${ey} L ${ex - head * Math.cos(ang + 0.5)} ${ey - head * Math.sin(ang + 0.5)}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </g>
  );
}

function Element({ el, isLast }: { el: CanvasElement; isLast: boolean }) {
  const cx = el.x * W;
  const cy = el.y * H;
  const color = markerColor(el.color);
  if (el.kind === "photo") {
    const pw = 210;
    const ph = 170;
    return (
      <g transform={`translate(${cx} ${cy}) rotate(${el.tilt})`} className={isLast ? "pop" : undefined}>
        <rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} fill="#fff" stroke="#d9d2c4" strokeWidth="2" style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.25))" }} />
        <image href={`/slides/${el.file}`} x={-pw / 2 + 12} y={-ph / 2 + 12} width={pw - 24} height={ph - 56} preserveAspectRatio="xMidYMid slice" />
        <text x="0" y={ph / 2 - 16} textAnchor="middle" fontFamily="Caveat, cursive" fontSize="26" fill="#2a241f">
          {el.label}
        </text>
        <rect x={-34} y={-ph / 2 - 12} width={68} height={22} fill="#ffe08a" opacity="0.85" transform="rotate(-4)" />
      </g>
    );
  }
  const px = EMOJI_PX[el.size];
  const emoji = EMOJI_BY_ID.get(el.ref) ?? "✏️";
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${el.tilt})`} className={isLast ? "pop" : undefined} style={{ color }}>
      <text x="0" y={px * 0.35 - 14} textAnchor="middle" fontSize={px} style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>
        {emoji}
      </text>
      <text x="0" y={px / 2 + 30} textAnchor="middle" fontFamily="Caveat, cursive" fontSize={el.size === 3 ? 46 : el.size === 2 ? 38 : 32} fill="currentColor">
        {el.label}
      </text>
    </g>
  );
}

export function IlustradorView({ state, interim }: { state: SessionState; interim: string }) {
  const els = state.canvas.elements;
  const live = interim || state.transcript.at(-1)?.text || "";
  return (
    <div className="absolute inset-0" style={{ background: PAPER }}>
      <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: "radial-gradient(#cfc6b4 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet">
        <text x={W / 2} y={78} textAnchor="middle" fontFamily="Caveat, cursive" fontSize="54" fill="#2a241f">
          {state.topic || "…"}
        </text>
        <text x={W - 60} y={H - 40} textAnchor="end" fontFamily="Caveat, cursive" fontSize="34" fill="#8a8073">
          página {state.canvas.page}
        </text>
        {els.map((el, i) => (i > 0 ? <Arrow key={`a${el.id}`} from={els[i - 1]} to={el} color={markerColor(el.color)} seed={el.id} /> : null))}
        {/* Photos sit under the emojis so no handwritten label gets covered. */}
        {els.map((el, i) => (el.kind === "photo" ? <Element key={el.id} el={el} isLast={i === els.length - 1} /> : null))}
        {els.map((el, i) => (el.kind === "doodle" ? <Element key={el.id} el={el} isLast={i === els.length - 1} /> : null))}
        {els.length === 0 && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontFamily="Caveat, cursive" fontSize="58" fill="#8a8073">
            escuchando… el primer dibujo llega enseguida
          </text>
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-3 px-24 text-center">
        <p className="mx-auto max-w-5xl truncate font-display text-xl text-neutral-500 italic">{live ? `“${live}”` : ""}</p>
      </div>
    </div>
  );
}
