/**
 * Live session over WebSocket. Reconnects with backoff, exposes the latest
 * state snapshot + interim transcript, and typed senders.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientAction, ClientMessage, ClientRole, ConfigPatch, ServerMessage } from "@shared/protocol";
import type { SessionState } from "@shared/session";
import { api } from "@/lib/api";

export type ConnectionStatus = "connecting" | "open" | "reconnecting" | "missing" | "closed";

export function useSession(code: string, role: ClientRole) {
  const [state, setState] = useState<SessionState | null>(null);
  const [interim, setInterim] = useState("");
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastError, setLastError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const closedRef = useRef(false);
  const attemptRef = useRef(0);

  useEffect(() => {
    closedRef.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (closedRef.current) return;
      // A failed upgrade gives no status code to the browser, so check first.
      try {
        const s = await api.getSession(code);
        setState(s);
      } catch (err) {
        const m = (err as Error).message;
        if (m.includes("no encontrada") || m.includes("inválido")) {
          setStatus("missing");
          return;
        }
      }
      if (closedRef.current) return;
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/api/sessions/${code}/ws?role=${role}`);
      wsRef.current = ws;
      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus("open");
      };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data as string) as ServerMessage;
        if (msg.type === "state") {
          setState(msg.state);
          setInterim(msg.state.interim);
        } else if (msg.type === "interim") setInterim(msg.text);
        else if (msg.type === "error") setLastError(msg.message);
      };
      ws.onclose = () => {
        if (closedRef.current) return;
        setStatus("reconnecting");
        const delay = Math.min(8000, 500 * 2 ** attemptRef.current++);
        timer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    };
    void connect();

    // Keep-alive so proxies do not drop an idle socket.
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ type: "ping" }));
    }, 25_000);

    return () => {
      closedRef.current = true;
      if (timer) clearTimeout(timer);
      clearInterval(ping);
      wsRef.current?.close();
      setStatus("closed");
    };
  }, [code, role]);

  const send = useCallback((msg: ClientMessage): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  }, []);

  const sendAction = useCallback((action: ClientAction) => send({ type: "action", action }), [send]);
  const sendConfig = useCallback((patch: ConfigPatch) => send({ type: "config", patch }), [send]);
  const sendTranscript = useCallback((text: string, final: boolean) => send({ type: "transcript", text, final }), [send]);

  return { state, interim, status, lastError, send, sendAction, sendConfig, sendTranscript };
}

/** A clock that re-renders every `ms`, for timers derived from state timestamps. */
export function useNow(ms = 500): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
