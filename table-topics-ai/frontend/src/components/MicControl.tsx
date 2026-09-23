/**
 * The microphone: browser speech recognition → session WebSocket. Used full
 * size on the phone page and compact inside the operator panel.
 */
import { Mic, MicOff, Radio } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useWakeLock } from "@/hooks/useWakeLock";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MicControl({
  lang,
  connected,
  sendTranscript,
  hero = false,
  autoStart = false,
}: {
  lang: string;
  connected: boolean;
  sendTranscript: (text: string, final: boolean) => boolean;
  hero?: boolean;
  autoStart?: boolean;
}) {
  const [interim, setInterim] = useState("");
  const [lastFinal, setLastFinal] = useState("");
  const [sent, setSent] = useState(0);
  const lastInterimAt = useRef(0);

  const onFinal = useCallback(
    (text: string) => {
      setLastFinal(text);
      setInterim("");
      if (sendTranscript(text, true)) setSent((n) => n + 1);
    },
    [sendTranscript],
  );
  const onInterim = useCallback(
    (text: string) => {
      setInterim(text);
      const now = Date.now();
      if (now - lastInterimAt.current > 350) {
        lastInterimAt.current = now;
        sendTranscript(text, false);
      }
    },
    [sendTranscript],
  );

  const rec = useSpeechRecognition({ lang, onFinal, onInterim });
  const wake = useWakeLock(rec.listening);

  const started = useRef(false);
  useEffect(() => {
    if (autoStart && !started.current && rec.supported) {
      started.current = true;
      rec.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, rec.supported]);

  const toggle = () => (rec.listening ? rec.stop() : rec.start());

  return (
    <div className={cn("flex flex-col items-center gap-4", hero ? "py-6" : "")}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={rec.listening}
        className={cn(
          "relative grid place-items-center rounded-full border-2 transition-all active:scale-95",
          hero ? "size-44" : "size-16",
          rec.listening
            ? "border-primary bg-primary text-primary-foreground shadow-[0_0_60px_-10px_var(--primary)]"
            : "border-border bg-card text-foreground hover:border-primary/60",
        )}
      >
        {rec.listening && rec.engineActive && (
          <span className="absolute inset-0 rounded-full border-2 border-primary" style={{ animation: "pulse-ring 1.6s ease-out infinite" }} />
        )}
        {rec.listening ? <Mic className={hero ? "size-16" : "size-6"} /> : <MicOff className={hero ? "size-16" : "size-6"} />}
      </button>

      <div className="text-center">
        <div className={cn("font-medium", hero ? "text-lg" : "text-sm")}>
          {rec.listening ? (rec.engineActive ? "Escuchando…" : "Reiniciando el reconocimiento…") : "Toca para empezar a escuchar"}
        </div>
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Radio className={cn("size-3", connected ? "text-success" : "text-destructive")} />
          {connected ? "Conectado a la sesión" : "Sin conexión con la sesión"}
          <span>·</span>
          <span className="tabular">{sent} frases enviadas</span>
          {rec.restarts > 0 && (
            <>
              <span>·</span>
              <span className="tabular">{rec.restarts} reinicios</span>
            </>
          )}
        </div>
        {rec.listening && hero && (
          <div className={cn("mt-1 text-xs", wake === "failed" ? "text-warning" : "text-muted-foreground")}>
            {wake === "api" || wake === "video"
              ? "La pantalla no se apagará mientras escuche."
              : wake === "failed"
                ? "No he podido evitar el bloqueo: desactiva el bloqueo automático en los ajustes del móvil."
                : "Protegiendo la pantalla…"}
          </div>
        )}
      </div>

      {rec.error && <p className="max-w-sm text-center text-sm text-destructive">{rec.error}</p>}
      {!rec.supported && !rec.error && (
        <p className="max-w-sm text-center text-sm text-warning">
          Este navegador no soporta reconocimiento de voz. En el móvil usa Chrome (Android) o Safari (iPhone).
        </p>
      )}

      <div
        className={cn(
          "w-full rounded-lg border border-border bg-card/60 px-4 py-3 text-left",
          hero ? "min-h-28 text-base" : "min-h-14 text-sm",
        )}
      >
        {interim ? (
          <span className="text-foreground">{interim}</span>
        ) : lastFinal ? (
          <span className="text-muted-foreground">{lastFinal}</span>
        ) : (
          <span className="text-muted-foreground/60">Aquí verás lo que se transcribe…</span>
        )}
      </div>

      {hero && rec.listening && (
        <Button variant="outline" size="sm" onClick={rec.stop}>
          Parar
        </Button>
      )}
    </div>
  );
}
