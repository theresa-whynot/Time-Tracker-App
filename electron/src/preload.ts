import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("timeTracker", {
  openPrompt: () => ipcRenderer.invoke("prompt:open"),
  onOpenPrompt: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on("prompt:open", listener);
    return () => ipcRenderer.removeListener("prompt:open", listener);
  },
  requestPromptAttention: () => ipcRenderer.invoke("prompt:request-attention"),
  releasePromptAttention: () => ipcRenderer.invoke("prompt:release-attention"),
});
