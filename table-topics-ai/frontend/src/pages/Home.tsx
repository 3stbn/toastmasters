import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { GAME_MODES } from "@shared/session";
import { api, normalizeCode } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Home() {
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    setCreating(true);
    try {
      const { code } = await api.createSession();
      navigate(`/s/${code}`); // this device becomes the screen
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 4) return;
    try {
      await api.getSession(code);
      navigate(`/s/${code}/mic`); // this device becomes the microphone + remote
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-safe pb-safe">
      <section className="flex flex-1 flex-col justify-center py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Toastmasters · noche de juegos</p>
        <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
          El público ve lo que
          <br />
          <em className="text-primary">el orador</em> no puede.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Improvisa en español. El proyector, a tu espalda, reacciona en directo: diapositivas imposibles, subtítulos
          sinceros o una banda sonora que sigue tu tono.
        </p>

        <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end">
          <div>
            <div className="mb-1.5 text-xs uppercase tracking-widest text-muted-foreground">En el ordenador del proyector (o un móvil que haga de pantalla)</div>
            <Button size="lg" onClick={create} disabled={creating} className="h-14 px-8 text-base">
              {creating ? "Creando…" : "Crear sesión"}
            </Button>
          </div>
          <form onSubmit={join} className="flex items-end gap-2">
            <div>
              <label htmlFor="code" className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">
                En el móvil: código de la pantalla
              </label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value))}
                placeholder="ABCD"
                autoCapitalize="characters"
                autoComplete="off"
                className="h-14 w-40 text-center font-mono text-2xl tracking-[0.4em] uppercase"
              />
            </div>
            <Button type="submit" variant="outline" size="lg" className="h-14" disabled={code.length !== 4}>
              Entrar
            </Button>
          </form>
        </div>
        <div className="mt-3 text-sm text-muted-foreground">
          ¿Sin proyector? Crea la sesión en un móvil (será la pantalla) y escanea el QR con otro. O{" "}
          <button
            type="button"
            className="underline underline-offset-2 hover:text-foreground disabled:opacity-50"
            disabled={code.length !== 4}
            onClick={async () => {
              try {
                await api.getSession(code);
                navigate(`/s/${code}`);
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            entra con el código como pantalla
          </button>
          .
        </div>
      </section>

      <section className="grid gap-3 pb-12 sm:grid-cols-3">
        {GAME_MODES.map((g) => (
          <div key={g.id} className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-lg font-semibold">{g.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{g.tagline}</p>
          </div>
        ))}
      </section>

      <footer className="flex items-center justify-end border-t border-border py-4 text-xs text-muted-foreground">
        <Link href="/creditos" className="hover:text-foreground">
          Créditos
        </Link>
      </footer>
    </main>
  );
}
