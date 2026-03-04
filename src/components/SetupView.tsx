import { useState } from 'react';
import type { Participant, Result } from '../types';
import { SPEECH_TYPES } from '../constants';
import ParticipantRow from './ParticipantRow';
import type { Translations, Lang } from '../i18n';
import { Timer, HelpCircle, Play, Settings, Trash2, Plus, ChevronDown, ChevronRight, X } from 'lucide-react';

interface SetupViewProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  results: Result[];
  onStart: (participant: Participant) => void;
  onRemoveParticipant: (id: string) => void;
  onRemoveResult: (index: number) => void;
  onDemo: () => void;
  onClearAll: () => void;
  showTimer: boolean;
  onToggleTimer: () => void;
  onHelp: () => void;
  i18n: Translations;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getStatusLabel(elapsed: number, type: Result['type'], i18n: Translations): { label: string; className: string } {
  if (elapsed < type.green) return { label: i18n.under, className: 'text-orange-500' };
  if (elapsed <= type.red) return { label: i18n.onTime, className: 'text-green-600' };
  return { label: i18n.over, className: 'text-red-600' };
}

export default function SetupView({ participants, setParticipants, results, onStart, onRemoveParticipant, onRemoveResult, onDemo, onClearAll, showTimer, onToggleTimer, onHelp, i18n, lang, onLangChange }: SetupViewProps) {
  const [name, setName] = useState('');
  const [typeId, setTypeId] = useState(SPEECH_TYPES[0].id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(true);
  const [resultsOpen, setResultsOpen] = useState(true);

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
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 p-4 pb-24 sm:gap-6 sm:p-6 sm:pb-24">
      {/* Header */}
      <div className="animate-fade-in flex items-center justify-center gap-3 pt-2">
        <Timer className="h-8 w-8 text-blue-600" />
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{i18n.title}</h1>
          <p className="text-sm text-gray-400 font-medium">{i18n.subtitle}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="animate-fade-in flex justify-center gap-3" style={{ animationDelay: '25ms' }}>
        <button
          onClick={onHelp}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 shadow-sm transition-all duration-150 hover:bg-gray-50 hover:text-gray-700 active:bg-gray-100"
        >
          <HelpCircle className="h-4 w-4" />
          {i18n.howItWorks}
        </button>
        <button
          onClick={onDemo}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-500 shadow-sm transition-all duration-150 hover:bg-gray-50 hover:text-gray-700 active:bg-gray-100"
        >
          <Play className="h-4 w-4" />
          {i18n.demo}
        </button>
        <button
          onClick={onClearAll}
          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 shadow-sm transition-all duration-150 hover:bg-red-50 hover:text-red-600 active:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          onClick={() => setSettingsOpen((o) => !o)}
          className="flex items-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-500 shadow-sm transition-all duration-150 hover:bg-gray-50 hover:text-gray-700 active:bg-gray-100"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Settings panel */}
      {settingsOpen && (
        <div className="animate-fade-in flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50/50 p-4">
          <div className="flex flex-wrap justify-center gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm cursor-pointer">
              <span className="text-sm font-semibold text-gray-500">{i18n.showTimer}</span>
              <div
                onClick={onToggleTimer}
                className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${showTimer ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${showTimer ? 'translate-x-5' : ''}`} />
              </div>
            </label>
            <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-0.5 shadow-sm">
              {(['en', 'es'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => onLangChange(l)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                    lang === l
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {l === 'en' ? 'EN' : 'ES'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add participant form */}
      <div className="animate-fade-in flex flex-col gap-3 sm:flex-row" style={{ animationDelay: '50ms' }}>
        <input
          type="text"
          placeholder={i18n.participantName}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm transition-all duration-200 focus:border-blue-400 focus:bg-blue-50/30 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <div className="flex gap-3">
          <select
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:flex-initial"
          >
            {SPEECH_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 active:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            {i18n.add}
          </button>
        </div>
      </div>

      {/* Participants list */}
      {participants.length === 0 ? (
        <p className="animate-fade-in text-center text-gray-400 text-lg mt-8">
          {i18n.noParticipants}
        </p>
      ) : (
        <div className="animate-fade-in rounded-2xl border border-gray-200 bg-gray-50/50 p-4" style={{ animationDelay: '100ms' }}>
          <button
            onClick={() => setParticipantsOpen((o) => !o)}
            className="mb-3 w-full cursor-pointer text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center justify-between"
          >
            <span>{i18n.participants} ({participants.length})</span>
            {participantsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {participantsOpen && (
            <div className="flex flex-col gap-3">
              {participants.map((p, i) => (
                <ParticipantRow
                  key={p.id}
                  participant={p}
                  index={i}
                  result={results.find((r) => r.participantId === p.id)}
                  onStart={() => onStart(p)}
                  onRemove={() => onRemoveParticipant(p.id)}
                  onClearResult={() => onRemoveResult(results.findIndex((r) => r.participantId === p.id))}
                  i18n={i18n}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="animate-fade-in mt-4 rounded-2xl border border-gray-200 bg-gray-50/50 p-4" style={{ animationDelay: '150ms' }}>
          <button
            onClick={() => setResultsOpen((o) => !o)}
            className="mb-3 w-full cursor-pointer text-sm font-semibold uppercase tracking-wider text-gray-400 flex items-center justify-between"
          >
            <span>{i18n.results} ({results.length})</span>
            {resultsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          {resultsOpen && (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3.5 text-sm font-semibold text-gray-500 uppercase tracking-wider">{i18n.name}</th>
                  <th className="px-4 py-3.5 text-sm font-semibold text-gray-500 uppercase tracking-wider">{i18n.type}</th>
                  <th className="px-4 py-3.5 text-sm font-semibold text-gray-500 uppercase tracking-wider">{i18n.time}</th>
                  <th className="px-4 py-3.5 text-sm font-semibold text-gray-500 uppercase tracking-wider">{i18n.status}</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const status = getStatusLabel(r.elapsed, r.type, i18n);
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
                          className="rounded-full bg-red-50 p-1.5 text-red-600 transition-colors duration-150 hover:bg-red-100 active:bg-red-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
