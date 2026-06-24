import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("timeTracker", {
  requestPromptAttention: () => ipcRenderer.invoke("prompt:request-attention"),
  releasePromptAttention: () => ipcRenderer.invoke("prompt:release-attention"),
});
