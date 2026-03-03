import { useState } from 'react';
import type { Participant, Result } from '../types';
import { SPEECH_TYPES } from '../constants';
import ParticipantRow from './ParticipantRow';

interface SetupViewProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  results: Result[];
  onStart: (participant: Participant) => void;
  onRemoveParticipant: (id: string) => void;
  onRemoveResult: (index: number) => void;
  onDemo: () => void;
  onClearAll: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getStatus(elapsed: number, type: Result['type']): { label: string; className: string } {
  if (elapsed < type.green) return { label: 'Under', className: 'text-orange-500' };
  if (elapsed <= type.red) return { label: 'On Time', className: 'text-green-600' };
  return { label: 'Over', className: 'text-red-600' };
}

export default function SetupView({ participants, setParticipants, results, onStart, onRemoveParticipant, onRemoveResult, onDemo, onClearAll }: SetupViewProps) {
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState(SPEECH_TYPES[0].id);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const speechType = SPEECH_TYPES.find((t) => t.id === typeId)!;
    setParticipants((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: trimmed, type: speechType },
    ]);
    setName('');
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-center gap-3 pt-2">
        <span className="text-3xl" role="img" aria-label="clock">⏱</span>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Toastmasters Timekeeper</h1>
          <p className="text-sm text-gray-400 font-medium">Track speeches with precision</p>
        </div>
      </div>

      {/* Demo button */}
      <div className="animate-fade-in flex justify-center gap-3" style={{ animationDelay: '25ms' }}>
        <button
          onClick={onDemo}
          className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-500 shadow-sm transition-all duration-150 hover:bg-gray-50 hover:text-gray-700 active:bg-gray-100"
        >
          Demo
        </button>
        <button
          onClick={onClearAll}
          className="rounded-xl border border-red-200 bg-white px-5 py-2 text-sm font-semibold text-red-500 shadow-sm transition-all duration-150 hover:bg-red-50 hover:text-red-600 active:bg-red-100"
        >
          Clear All
        </button>
      </div>

      {/* Add participant form */}
      <div className="animate-fade-in flex gap-3" style={{ animationDelay: '50ms' }}>
        <input
          type="text"
          placeholder="Participant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg shadow-sm transition-all duration-200 focus:border-blue-400 focus:bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={typeId}
          onChange={(e) => setTypeId(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-lg shadow-sm transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          {SPEECH_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          className="shrink-0 rounded-xl bg-blue-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 active:bg-blue-700"
        >
          Add
        </button>
      </div>

      {/* Participants list */}
      {participants.length === 0 ? (
        <p className="animate-fade-in text-center text-gray-400 text-lg mt-8">
          No participants yet. Add someone above to get started.
        </p>
      ) : (
        <div className="animate-fade-in rounded-2xl border border-gray-200 bg-gray-50/50 p-4" style={{ animationDelay: '100ms' }}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
            Participants ({participants.length})
          </h2>
          <div className="flex flex-col gap-3">
            {participants.map((p, i) => (
              <ParticipantRow
                key={p.id}
                participant={p}
                index={i}
                onStart={() => onStart(p)}
                onRemove={() => onRemoveParticipant(p.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="animate-fade-in mt-4" style={{ animationDelay: '150ms' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-3">Results</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3.5 text-sm font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3.5 text-sm font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3.5 text-sm font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3.5 text-sm font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const status = getStatus(r.elapsed, r.type);
                  return (
                    <tr key={i} className="border-t border-gray-100 transition-colors duration-150 hover:bg-gray-50">
                      <td className="px-4 py-3.5 text-base font-medium text-gray-900">{r.name}</td>
                      <td className="px-4 py-3.5 text-base text-gray-500">{r.type.label}</td>
                      <td className="px-4 py-3.5 text-base font-mono text-gray-700">{formatTime(r.elapsed)}</td>
                      <td className={`px-4 py-3.5 text-base font-semibold ${status.className}`}>
                        {status.label}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => onRemoveResult(i)}
                          className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors duration-150 hover:bg-red-100 active:bg-red-200"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
