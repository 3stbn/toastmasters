import { useState, useEffect } from 'react';
import type { Participant, Result } from './types';
import SetupView from './components/SetupView';
import TimerView from './components/TimerView';
import DemoView from './components/DemoView';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>(() => loadJSON('participants', []));
  const [results, setResults] = useState<Result[]>(() => loadJSON('results', []));
  const [activeParticipant, setActiveParticipant] = useState<Participant | null>(null);
  const [demo, setDemo] = useState(false);

  useEffect(() => { localStorage.setItem('participants', JSON.stringify(participants)); }, [participants]);
  useEffect(() => { localStorage.setItem('results', JSON.stringify(results)); }, [results]);

  function handleClearAll() {
    setParticipants([]);
    setResults([]);
  }

  function handleStop(elapsed: number) {
    if (activeParticipant) {
      setResults((prev) => [
        ...prev,
        {
          participantId: activeParticipant.id,
          name: activeParticipant.name,
          type: activeParticipant.type,
          elapsed,
        },
      ]);
    }
    setActiveParticipant(null);
  }

  function handleRemoveParticipant(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setResults((prev) => prev.filter((r) => r.participantId !== id));
  }

  function handleRemoveResult(index: number) {
    setResults((prev) => prev.filter((_, i) => i !== index));
  }

  if (demo) {
    return <DemoView onExit={() => setDemo(false)} />;
  }

  if (activeParticipant) {
    return (
      <TimerView
        participant={activeParticipant}
        onStop={handleStop}
      />
    );
  }

  return (
    <SetupView
      participants={participants}
      setParticipants={setParticipants}
      results={results}
      onStart={(p) => setActiveParticipant(p)}
      onRemoveParticipant={handleRemoveParticipant}
      onRemoveResult={handleRemoveResult}
      onDemo={() => setDemo(true)}
      onClearAll={handleClearAll}
    />
  );
}
