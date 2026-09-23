/**
 * Browser speech recognition (Web Speech API) tuned for a long, continuous
 * session: it restarts itself whenever the engine stops (Android Chrome ends
 * after every utterance, iOS after ~1 min) and surfaces the errors that
 * actually need a human (no permission, unsupported browser).
 */
import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
  onstart: (() => void) | null;
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export const speechSupported = typeof window !== "undefined" && getCtor() !== null;

export interface SpeechOptions {
  lang: string;
  onFinal: (text: string) => void;
  onInterim: (text: string) => void;
}

export function useSpeechRecognition({ lang, onFinal, onInterim }: SpeechOptions) {
  const [listening, setListening] = useState(false);
  const [engineActive, setEngineActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restarts, setRestarts] = useState(0);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const cbRef = useRef({ onFinal, onInterim });
  cbRef.current = { onFinal, onInterim };

  const stop = useCallback(() => {
    wantRef.current = false;
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* not started */
    }
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Este navegador no tiene reconocimiento de voz. Usa Chrome (Android/desktop) o Safari (iPhone).");
      return;
    }
    setError(null);
    wantRef.current = true;
    setListening(true);

    const boot = () => {
      if (!wantRef.current) return;
      const rec = new Ctor();
      recRef.current = rec;
      rec.lang = lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.onstart = () => setEngineActive(true);
      rec.onresult = (ev) => {
        let interim = "";
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          const text = r[0].transcript.trim();
          if (!text) continue;
          if (r.isFinal) cbRef.current.onFinal(text);
          else interim += (interim ? " " : "") + text;
        }
        cbRef.current.onInterim(interim);
      };
      rec.onerror = (ev) => {
        if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
          setError("Permiso de micrófono denegado. Actívalo en los ajustes del navegador.");
          wantRef.current = false;
          setListening(false);
        } else if (ev.error === "audio-capture") {
          setError("No se encontró ningún micrófono.");
          wantRef.current = false;
          setListening(false);
        }
        // no-speech / network / aborted: onend follows and we restart there.
      };
      rec.onend = () => {
        setEngineActive(false);
        recRef.current = null;
        if (wantRef.current) {
          setRestarts((n) => n + 1);
          setTimeout(boot, 300);
        }
      };
      try {
        rec.start();
      } catch {
        setTimeout(boot, 1000);
      }
    };
    boot();
  }, [lang]);

  // Restart with the new language if it changes mid-session.
  useEffect(() => {
    if (wantRef.current) {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    }
  }, [lang]);

  useEffect(() => () => stop(), [stop]);

  return { listening, engineActive, error, restarts, start, stop, supported: speechSupported };
}
