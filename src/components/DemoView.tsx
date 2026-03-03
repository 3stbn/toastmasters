import { useState, useEffect } from 'react';
import usePresentation from '../usePresentation';

const PHASES = [
  { bg: 'bg-gray-100 text-gray-900', label: 'Neutral' },
  { bg: 'bg-green-400 text-white', label: 'Green' },
  { bg: 'bg-yellow-300 text-gray-900', label: 'Yellow' },
  { bg: 'bg-red-500 text-white', label: 'Red' },
  { bg: 'bg-gray-900 text-white', label: 'Over' },
];

interface DemoViewProps {
  onExit: () => void;
}

export default function DemoView({ onExit }: DemoViewProps) {
  usePresentation();
  const [index, setIndex] = useState(0);
  const [flash, setFlash] = useState(false);

  function advance() {
    if (index < PHASES.length - 1) {
      setFlash(true);
      if (navigator.vibrate) navigator.vibrate(500);
      setIndex((i) => i + 1);
    } else {
      onExit();
    }
  }

  useEffect(() => {
    if (flash) {
      const timeout = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [flash]);

  const phase = PHASES[index];
  const bgClass = flash ? 'bg-white text-gray-900' : phase.bg;

  return (
    <div
      className={`flex min-h-dvh flex-col items-center justify-center transition-colors duration-300 ${bgClass}`}
      onClick={advance}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        className="absolute top-4 left-4 flex h-12 w-12 items-center justify-center rounded-full bg-black/20 text-2xl backdrop-blur-sm transition-all duration-150 hover:bg-black/30 active:bg-black/40"
      >
        ←
      </button>
    </div>
  );
}
