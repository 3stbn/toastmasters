import type { SessionSettings, SessionState } from "@shared/session";
import type { ConfigPatch } from "@shared/protocol";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NumKey = { [K in keyof SessionSettings]: SessionSettings[K] extends number ? K : never }[keyof SessionSettings];

const GROUPS: { title: string; fields: { key: NumKey; label: string; step?: number; min?: number; max?: number }[] }[] = [
  {
    title: "Ilustrador automático",
    fields: [
      { key: "doodleMinSeconds", label: "Segundos entre garabatos", step: 0.5, min: 1 },
      { key: "doodlesPerPage", label: "Garabatos por página", min: 4, max: 24 },
    ],
  },
  {
    title: "Subtítulos de la verdad",
    fields: [
      { key: "subtitleThreshold", label: "Umbral por defecto", step: 0.05, min: 0, max: 1 },
      { key: "subtitleMinGapSeconds", label: "Silencio entre subtítulos (s)", min: 0 },
      { key: "subtitleMaxSilenceSeconds", label: "Máximo sin subtítulo (s)", min: 0 },
      { key: "subtitleFloor", label: "Probabilidad mínima por cadencia", step: 0.05, min: 0, max: 1 },
      { key: "subtitleCooldownSeconds", label: "Repetir comportamiento tras (s)", min: 0 },
      { key: "subtitleDurationSeconds", label: "Duración en pantalla (s)", min: 1 },
    ],
  },
  {
    title: "Banda sonora",
    fields: [
      { key: "moodMinIntervalSeconds", label: "Mínimo entre cambios (s)", min: 0 },
      { key: "moodSwitchThreshold", label: "Probabilidad suavizada para cambiar", step: 0.05, min: 0, max: 1 },
      { key: "moodSwitchMargin", label: "Margen sobre el actual", step: 0.02, min: 0, max: 1 },
      { key: "musicVolume", label: "Volumen de la música", step: 0.05, min: 0, max: 1 },
    ],
  },
];

const LANGS: { id: string; label: string }[] = [
  { id: "es-ES", label: "Español (España)" },
  { id: "es-MX", label: "Español (México)" },
  { id: "es-AR", label: "Español (Argentina)" },
  { id: "es-CO", label: "Español (Colombia)" },
  { id: "es-US", label: "Español (EE. UU.)" },
  { id: "en-US", label: "English (US)" },
];

const ENGINES: { id: SessionSettings["engine"]; label: string; hint: string }[] = [
  { id: "jev", label: "Nube (rápido)", hint: "Responde en menos de medio segundo." },
  { id: "local", label: "Local (el Mac de casa)", hint: "Modelo abierto en el ordenador de Esteban, a través del túnel. Más lento; experimento." },
];

export function SettingsPanel({ state, onPatch }: { state: SessionState; onPatch: (p: ConfigPatch) => void }) {
  const s = state.settings;
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Label htmlFor="engine">Motor de decisiones</Label>
        <select
          id="engine"
          value={s.engine ?? "jev"}
          onChange={(e) => onPatch({ settings: { engine: e.target.value as SessionSettings["engine"] } })}
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm sm:w-64"
        >
          {ENGINES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{ENGINES.find((e) => e.id === (s.engine ?? "jev"))?.hint}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="lang">Idioma del micrófono</Label>
        <select
          id="lang"
          value={s.lang}
          onChange={(e) => onPatch({ settings: { lang: e.target.value } })}
          className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm sm:w-64"
        >
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
      {GROUPS.map((g) => (
        <div key={g.title}>
          <h4 className="mb-2 font-semibold">{g.title}</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type="number"
                  step={f.step ?? 1}
                  min={f.min}
                  max={f.max}
                  defaultValue={s[f.key]}
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v) && v !== s[f.key]) onPatch({ settings: { [f.key]: v } });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
