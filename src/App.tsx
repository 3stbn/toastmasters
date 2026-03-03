import { useState } from 'react';
import type { Participant, Result } from './types';
import SetupView from './components/SetupView';
import TimerView from './components/TimerView';
import DemoView from './components/DemoView';

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [activeParticipant, setActiveParticipant] = useState<Participant | null>(null);
  const [demo, setDemo] = useState(false);

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
    />
  );
}
