/// <reference types="vite/client" />

interface TimeTrackerDesktopBridge {
  openPrompt: () => Promise<void>;
  onOpenPrompt: (callback: () => void) => () => void;
  requestPromptAttention: () => Promise<void>;
  releasePromptAttention: () => Promise<void>;
}

interface Window {
  timeTracker?: TimeTrackerDesktopBridge;
}
