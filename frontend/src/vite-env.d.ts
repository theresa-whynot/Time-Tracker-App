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
  timeTracker?: TimeTrackerDesktopBridge;
}
