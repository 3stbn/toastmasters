import type { Participant } from '../types';

interface ParticipantRowProps {
  participant: Participant;
  index: number;
  onStart: () => void;
  onRemove: () => void;
}

const ACCENT_COLORS: Record<string, string> = {
  'ice-breaker': 'border-l-purple-500',
  'regular-speech': 'border-l-blue-500',
  'evaluation': 'border-l-amber-500',
  'table-topics': 'border-l-emerald-500',
};

export default function ParticipantRow({ participant, index, onStart, onRemove }: ParticipantRowProps) {
  const accent = ACCENT_COLORS[participant.type.id] || 'border-l-gray-400';

  return (
    <div
      className={`animate-fade-in flex items-center gap-3 rounded-xl border-l-4 bg-white p-4 shadow-sm transition-shadow duration-200 hover:shadow-md ${accent}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-500">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-lg font-semibold truncate text-gray-900">{participant.name}</p>
        <p className="text-sm text-gray-500">{participant.type.label}</p>
      </div>
      <button
        onClick={onStart}
        className="shrink-0 rounded-full bg-green-600 px-5 py-2.5 text-base font-semibold text-white transition-all duration-150 hover:bg-green-500 active:bg-green-700"
      >
        Start
      </button>
      <button
        onClick={onRemove}
        className="shrink-0 rounded-full bg-red-500 px-4 py-2.5 text-base font-semibold text-white transition-all duration-150 hover:bg-red-400 active:bg-red-600"
      >
        Remove
      </button>
    </div>
  );
}
