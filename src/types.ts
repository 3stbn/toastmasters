export interface SpeechType {
  id: string;
  label: string;
  green: number;  // seconds
  yellow: number;
  red: number;
}

export interface Participant {
  id: string;
  name: string;
  type: SpeechType;
}

export interface Result {
  participantId: string;
  name: string;
  type: SpeechType;
  elapsed: number; // seconds
}
