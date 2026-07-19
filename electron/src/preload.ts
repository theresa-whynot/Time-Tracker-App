import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("timeTracker", {
  notifyTimerChanged: () => ipcRenderer.invoke("timer:changed"),
  openPrompt: () => ipcRenderer.invoke("prompt:open"),
  onOpenPrompt: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("prompt:open", listener);
    return () => ipcRenderer.removeListener("prompt:open", listener);
  },
  onTimerChanged: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("timer:changed", listener);
    return () => ipcRenderer.removeListener("timer:changed", listener);
  },
  requestPromptAttention: () => ipcRenderer.invoke("prompt:request-attention"),
  releasePromptAttention: () => ipcRenderer.invoke("prompt:release-attention"),
  setWidgetCollapsed: (collapsed: boolean) =>
    ipcRenderer.invoke("widget:set-collapsed", collapsed),
});
