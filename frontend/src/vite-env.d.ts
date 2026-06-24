/// <reference types="vite/client" />

interface TimeTrackerDesktopBridge {
  requestPromptAttention: () => Promise<void>;
  releasePromptAttention: () => Promise<void>;
}

interface Window {
  timeTracker?: TimeTrackerDesktopBridge;
}
