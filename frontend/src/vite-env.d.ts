/// <reference types="vite/client" />

interface TimeTrackerDesktopBridge {
  notifyTimerChanged: () => Promise<void>;
  openPrompt: () => Promise<void>;
  onOpenPrompt: (callback: () => void) => () => void;
  onTimerChanged: (callback: () => void) => () => void;
  requestPromptAttention: () => Promise<void>;
  releasePromptAttention: () => Promise<void>;
  setWidgetCollapsed: (collapsed: boolean) => Promise<void>;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  timeTracker?: TimeTrackerDesktopBridge;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
}
