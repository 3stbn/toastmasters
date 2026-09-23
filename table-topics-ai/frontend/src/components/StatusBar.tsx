import { Link } from "wouter";
import type { SessionState } from "@shared/session";
import type { ConnectionStatus } from "@/hooks/useSession";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connecting: "conectando",
  open: "en directo",
  reconnecting: "reconectando",
  missing: "sesión no encontrada",
  closed: "cerrado",
};

export function StatusBar({ state, status, title }: { state: SessionState | null; status: ConnectionStatus; title: string }) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border pb-3">
      <Link href="/" className="font-display text-lg font-semibold tracking-tight">
        Table Topics <span className="text-primary">AI</span>
      </Link>
      <span className="text-muted-foreground">/</span>
      <span className="text-sm text-muted-foreground">{title}</span>
      {state && (
        <Link href={`/s/${state.code}`} className="font-mono text-lg font-bold tracking-[0.3em] text-primary">
          {state.code}
        </Link>
      )}
      <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className={cn("inline-block size-2 rounded-full", status === "open" ? "bg-success" : status === "reconnecting" ? "bg-warning" : "bg-destructive")} />
          {STATUS_LABEL[status]}
        </span>
      </div>
    </header>
  );
}
