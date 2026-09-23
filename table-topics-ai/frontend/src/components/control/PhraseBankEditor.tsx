/** Edit the behaviours Jev looks for and the subtitles each can trigger. */
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { DEFAULT_BEHAVIORS, type Behavior } from "@shared/phrases";
import type { SessionState } from "@shared/session";
import type { ConfigPatch } from "@shared/protocol";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 40);
}

export function PhraseBankEditor({ state, onPatch }: { state: SessionState; onPatch: (p: ConfigPatch) => void }) {
  const [draft, setDraft] = useState<Behavior[]>(state.behaviors);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setDraft(state.behaviors);
  }, [state.behaviors, dirty]);

  const update = (i: number, patch: Partial<Behavior>) => {
    setDraft((d) => d.map((b, j) => (j === i ? { ...b, ...patch } : b)));
    setDirty(true);
  };
  const remove = (i: number) => {
    setDraft((d) => d.filter((_, j) => j !== i));
    setDirty(true);
  };
  const add = () => {
    setDraft((d) => [
      ...d,
      {
        id: `nuevo_${d.length + 1}`,
        label: "Nuevo comportamiento",
        instructions: "The speaker is …",
        criteria: { true: "…", false: "…" },
        phrases: ["Nuevo subtítulo"],
      },
    ]);
    setDirty(true);
  };
  const save = () => {
    const cleaned = draft
      .map((b) => ({ ...b, id: slug(b.id || b.label) || `b_${Math.random().toString(36).slice(2, 6)}`, phrases: b.phrases.map((p) => p.trim()).filter(Boolean) }))
      .filter((b) => b.phrases.length > 0 && b.instructions.trim());
    onPatch({ behaviors: cleaned });
    setDirty(false);
  };
  const restore = () => {
    setDraft(DEFAULT_BEHAVIORS.map((b) => ({ ...b, phrases: [...b.phrases] })));
    setDirty(true);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada comportamiento es una pregunta sí/no (en inglés, que es donde la IA acierta más). El subtítulo se muestra cuando
        la probabilidad supera el umbral. Cambia frases, umbrales o inventa comportamientos nuevos.
      </p>
      <div className="flex gap-2">
        <Button onClick={save} disabled={!dirty}>
          Guardar cambios
        </Button>
        <Button variant="outline" onClick={add}>
          <Plus className="size-4" /> Añadir
        </Button>
        <Button variant="ghost" onClick={restore}>
          Restaurar por defecto
        </Button>
      </div>
      <div className="space-y-3">
        {draft.map((b, i) => (
          <details key={i} className="rounded-lg border border-border bg-background/40 p-3" open={i < 2}>
            <summary className="flex cursor-pointer items-center gap-3">
              <span className="font-medium">{b.label}</span>
              <span className="text-xs text-muted-foreground tabular">
                umbral {(b.threshold ?? state.settings.subtitleThreshold).toFixed(2)} · {b.phrases.length} frases
              </span>
              <button type="button" className="ml-auto text-muted-foreground hover:text-destructive" onClick={(e) => (e.preventDefault(), remove(i))} aria-label="Eliminar">
                <Trash2 className="size-4" />
              </button>
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-1">
                <Label>Nombre</Label>
                <Input value={b.label} onChange={(e) => update(i, { label: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Umbral</Label>
                <Input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={b.threshold ?? ""}
                  placeholder={state.settings.subtitleThreshold.toFixed(2)}
                  onChange={(e) => update(i, { threshold: e.target.value === "" ? undefined : Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Pregunta (afirmación verdadera/falsa)</Label>
                <Textarea rows={2} value={b.instructions} onChange={(e) => update(i, { instructions: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Cuenta como VERDADERO si…</Label>
                <Textarea rows={2} value={b.criteria.true} onChange={(e) => update(i, { criteria: { ...b.criteria, true: e.target.value } })} />
              </div>
              <div className="space-y-1">
                <Label>Cuenta como FALSO si…</Label>
                <Textarea rows={2} value={b.criteria.false} onChange={(e) => update(i, { criteria: { ...b.criteria, false: e.target.value } })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Subtítulos (uno por línea)</Label>
                <Textarea rows={4} value={b.phrases.join("\n")} onChange={(e) => update(i, { phrases: e.target.value.split("\n") })} />
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
