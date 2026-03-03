import { useState } from 'react';

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
  const [index, setIndex] = useState(0);

  function advance() {
    if (index < PHASES.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onExit();
    }
  }

  const phase = PHASES[index];

  return (
    <div
      className={`flex min-h-dvh flex-col items-center justify-center transition-colors duration-300 ${phase.bg}`}
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
