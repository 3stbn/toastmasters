import { useState, useEffect, useRef } from 'react';
import type { Participant } from '../types';

interface TimerViewProps {
  participant: Participant;
  onStop: (elapsed: number) => void;
}

type Phase = 'neutral' | 'green' | 'yellow' | 'red' | 'over';

function getPhase(elapsed: number, green: number, yellow: number, red: number): Phase {
  if (elapsed < green) return 'neutral';
  if (elapsed < yellow) return 'green';
  if (elapsed < red) return 'yellow';
  if (elapsed < red + 30) return 'red';
  return 'over';
}

const PHASE_STYLES: Record<Phase, string> = {
  neutral: 'bg-gray-100 text-gray-900',
  green: 'bg-green-400 text-white',
  yellow: 'bg-yellow-300 text-gray-900',
  red: 'bg-red-500 text-white',
  over: 'bg-gray-900 text-white',
};


function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TimerView({ participant, onStop }: TimerViewProps) {
  const [elapsed, setElapsed] = useState(0);
  const [flash, setFlash] = useState(false);
  const prevPhaseRef = useRef<Phase>('neutral');
  const intervalRef = useRef<number | null>(null);

  const { green, yellow, red } = participant.type;
  const phase = getPhase(elapsed, green, yellow, red);

  // Flash + vibrate on phase change
  useEffect(() => {
    if (phase !== prevPhaseRef.current && prevPhaseRef.current !== null && elapsed > 0) {
      setFlash(true);
      if (navigator.vibrate) navigator.vibrate(500);
      const timeout = setTimeout(() => setFlash(false), 300);
      prevPhaseRef.current = phase;
      return () => clearTimeout(timeout);
    }
    prevPhaseRef.current = phase;
  }, [phase, elapsed]);

  // Timer interval
  useEffect(() => {
    intervalRef.current = window.setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, []);


  const bgClass = flash ? 'bg-white text-gray-900' : PHASE_STYLES[phase];

  return (
    <div
      className={`relative flex min-h-dvh flex-col items-center justify-center transition-colors duration-300 ${bgClass}`}
    >
      {phase === 'neutral' && (
        <p className="text-[10rem] font-bold leading-none tabular-nums font-mono">
          {formatTime(elapsed)}
        </p>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStop(elapsed);
        }}
        className="absolute top-4 left-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/20 text-2xl backdrop-blur-sm transition-all duration-150 hover:bg-black/30 active:bg-black/40"
      >
        ←
      </button>
    </div>
  );
}
