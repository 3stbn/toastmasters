import type { Participant, Result } from '../types';

interface ParticipantRowProps {
  participant: Participant;
  index: number;
  result?: Result;
  onStart: () => void;
  onRemove: () => void;
  onClearResult: () => void;
}

const ACCENT_COLORS: Record<string, string> = {
  'ice-breaker': 'border-l-purple-500',
  'regular-speech': 'border-l-blue-500',
  'evaluation': 'border-l-amber-500',
  'table-topics': 'border-l-emerald-500',
};

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getStatus(elapsed: number, green: number, red: number): { label: string; className: string } {
  if (elapsed < green) return { label: 'Under', className: 'text-orange-500' };
  if (elapsed <= red) return { label: 'On Time', className: 'text-green-600' };
  return { label: 'Over', className: 'text-red-600' };
}

export default function ParticipantRow({ participant, index, result, onStart, onRemove, onClearResult }: ParticipantRowProps) {
  const accent = ACCENT_COLORS[participant.type.id] || 'border-l-gray-400';
  const { green, yellow, red } = participant.type;

  return (
    <div
      className={`animate-fade-in flex flex-col gap-3 rounded-xl border-l-4 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md ${accent}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold truncate text-gray-900 sm:text-lg">{participant.name}</p>
          <p className="text-sm text-gray-500">{participant.type.label}</p>
        </div>
        {result ? (
          <button
            onClick={onClearResult}
            className="shrink-0 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-orange-400 active:bg-orange-600 sm:px-5 sm:py-2.5 sm:text-base"
          >
            Reset
          </button>
        ) : (
          <button
            onClick={onStart}
            className="shrink-0 rounded-full bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-green-500 active:bg-green-700 sm:px-5 sm:py-2.5 sm:text-base"
          >
            Start
          </button>
        )}
        <button
          onClick={onRemove}
          className="shrink-0 rounded-full bg-red-500 px-3 py-2 text-sm font-semibold text-white transition-all duration-150 hover:bg-red-400 active:bg-red-600 sm:px-4 sm:py-2.5 sm:text-base"
        >
          Remove
        </button>
      </div>

      {/* Time limits */}
      <div className="flex gap-3 text-xs font-mono pl-11">
        <span className="text-green-600">{fmt(green)}</span>
        <span className="text-yellow-500">{fmt(yellow)}</span>
        <span className="text-red-600">{fmt(red)}</span>
      </div>

      {/* Result */}
      {result && (
        <div className="flex items-center gap-3 pl-11 text-sm">
          <span className="font-mono text-gray-700">{fmt(result.elapsed)}</span>
          <span className={`font-semibold ${getStatus(result.elapsed, green, red).className}`}>
            {getStatus(result.elapsed, green, red).label}
          </span>
        </div>
      )}
    </div>
  );
}
