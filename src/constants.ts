import type { SpeechType } from './types';

export const SPEECH_TYPES: SpeechType[] = [
  { id: 'ice-breaker',    label: 'Ice Breaker',    green: 240, yellow: 300, red: 360 },
  { id: 'regular-speech', label: 'Regular Speech',  green: 300, yellow: 360, red: 420 },
  { id: 'evaluation',     label: 'Evaluation',      green: 120, yellow: 150, red: 180 },
  { id: 'table-topics',   label: 'Table Topics',    green: 60,  yellow: 90,  red: 120 },
];
