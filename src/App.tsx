import { useState, useEffect } from 'react';
import type { Participant, Result } from './types';
import SetupView from './components/SetupView';
import TimerView from './components/TimerView';
import DemoView from './components/DemoView';
import OnboardingModal from './components/OnboardingModal';
import { t, type Lang } from './i18n';

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
  const [showTimer, setShowTimer] = useState(() => loadJSON('showTimer', false));
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboardingSeen'));
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('lang') as Lang | null;
    if (stored) return stored;
    return navigator.language.startsWith('es') ? 'es' : 'en';
  });

  const i18n = t(lang);

  useEffect(() => { localStorage.setItem('participants', JSON.stringify(participants)); }, [participants]);
  useEffect(() => { localStorage.setItem('results', JSON.stringify(results)); }, [results]);
  useEffect(() => { localStorage.setItem('showTimer', JSON.stringify(showTimer)); }, [showTimer]);
  useEffect(() => { localStorage.setItem('lang', lang); }, [lang]);

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
        showTimer={showTimer}
      />
    );
  }

  return (
    <>
    {showOnboarding && (
      <OnboardingModal i18n={i18n} onDone={() => {
        localStorage.setItem('onboardingSeen', 'true');
        setShowOnboarding(false);
      }} />
    )}
    <SetupView
      participants={participants}
      setParticipants={setParticipants}
      results={results}
      onStart={(p) => setActiveParticipant(p)}
      onRemoveParticipant={handleRemoveParticipant}
      onRemoveResult={handleRemoveResult}
      onDemo={() => setDemo(true)}
      onClearAll={handleClearAll}
      showTimer={showTimer}
      onToggleTimer={() => setShowTimer((v: boolean) => !v)}
      onHelp={() => setShowOnboarding(true)}
      i18n={i18n}
      lang={lang}
      onLangChange={setLang}
    />
    </>
  );
}
