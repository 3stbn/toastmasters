import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function SessionMissing({ code }: { code: string }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="font-mono text-4xl font-bold tracking-[0.3em] text-muted-foreground">{code}</div>
      <h1 className="font-display text-2xl font-semibold">Esa sesión no existe</h1>
      <p className="text-muted-foreground">Puede que haya caducado (se borran tras 12 h sin uso) o que el código esté mal.</p>
      <Button asChild>
        <Link href="/">Volver al inicio</Link>
      </Button>
    </main>
  );
}
