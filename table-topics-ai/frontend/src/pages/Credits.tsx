import { Link } from "wouter";
import slides from "@shared/slides.json";
import { MUSIC } from "@shared/music";
import { MOODS } from "@shared/moods";

type SlideMeta = { id: string; caption: string; credit: { title: string; artist: string; license: string; url: string } };

export function Credits() {
  const list = slides as SlideMeta[];
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 pt-safe pb-safe">
      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Inicio
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold">Créditos</h1>
      <p className="mt-2 text-muted-foreground">
        Decisiones: <a className="underline" href="https://docs.typesafe.ai">TypeSafe Jev</a> vía OpenRouter. Voz: reconocimiento
        de voz del navegador. Aplicación desplegada en Cloudflare Workers.
      </p>

      <h2 className="mt-10 font-display text-2xl font-semibold">Música</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Todas las piezas son de Kevin MacLeod (<a className="underline" href="https://incompetech.com">incompetech.com</a>), licencia{" "}
        <a className="underline" href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Recortadas a 2 minutos para el juego.
      </p>
      <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
        {MOODS.flatMap((m) =>
          (MUSIC[m.id] ?? []).map((t) => (
            <li key={t.file} className="text-muted-foreground">
              <span className="text-foreground">{t.title}</span> · {m.label}
            </li>
          )),
        )}
      </ul>

      <h2 className="mt-10 font-display text-2xl font-semibold">Imágenes</h2>
      <p className="mt-1 text-sm text-muted-foreground">De Wikimedia Commons, con licencias libres (CC0, dominio público, CC BY, CC BY-SA).</p>
      <ul className="mt-4 space-y-1 text-sm">
        {list.map((s) => (
          <li key={s.id} className="text-muted-foreground">
            <a className="text-foreground underline-offset-2 hover:underline" href={s.credit.url}>
              {s.caption}
            </a>{" "}
            · {s.credit.artist || "autor desconocido"} · {s.credit.license}
          </li>
        ))}
      </ul>
    </main>
  );
}
