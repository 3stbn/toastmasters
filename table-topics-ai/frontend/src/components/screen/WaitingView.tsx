import { GAME_MODES, type SessionState } from "@shared/session";
import type { ConnectionStatus } from "@/hooks/useSession";
import { sessionUrl } from "@/lib/api";
import { QrCode } from "@/components/QrCode";

export function WaitingView({
  state,
  status,
  soundReady,
  loaded,
}: {
  state: SessionState;
  status: ConnectionStatus;
  soundReady: boolean;
  loaded: number;
}) {
  const mode = state.mode ? GAME_MODES.find((g) => g.id === state.mode) : null;
  const hint =
    status !== "open"
      ? "Conectando…"
      : loaded < 1
        ? `Cargando la música… ${Math.round(loaded * 100)} %`
        : state.clients.mic === 0
          ? "Escanea el QR con un móvil: será el micrófono y el mando."
          : !soundReady
            ? "Móvil conectado. Haz clic aquí para activar el sonido."
            : state.mode
              ? state.topic
                ? "Todo listo. Pulsa «Empezar» en el móvil."
                : "El orador elige un tema; márcalo en el móvil."
              : "Elige el juego en el móvil.";

  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_center,oklch(0.24_0.02_55),oklch(0.12_0.01_55)_70%)]">
      <div className="grid max-w-5xl grid-cols-[auto_1fr] items-center gap-14 px-10">
        <div className="rounded-2xl bg-[#fff8ee] p-4">
          <QrCode value={sessionUrl(state.code, "mic")} size={260} />
        </div>
        <div>
          <div className="font-mono text-sm uppercase tracking-[0.35em] text-primary">Table Topics AI</div>
          <div className="mt-2 font-mono text-[9rem] leading-none font-bold tracking-[0.2em] text-white">{state.code}</div>
          <div className="mt-6 font-display text-3xl text-white/80">
            {mode ? mode.title : "Elige el juego desde el móvil"}
            {state.topic && (
              <>
                {" "}
                · <em className="text-white">{state.topic}</em>
              </>
            )}
          </div>
          {mode && !state.topic && state.topicOptions.length > 0 && (
            <ol className="mt-5 space-y-1 font-display text-2xl text-white/85">
              {state.topicOptions.map((t, i) => (
                <li key={t}>
                  <span className="mr-3 font-mono text-base text-primary">{i + 1}</span>
                  {t}
                </li>
              ))}
            </ol>
          )}
          <div className="mt-4 text-lg text-white/50">{hint}</div>
          {loaded < 1 && (
            <div className="mt-3 h-1.5 w-80 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.round(loaded * 100)}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
