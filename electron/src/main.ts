import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;
let attentionTimer: NodeJS.Timeout | null = null;

const devServerUrl = process.env.ELECTRON_START_URL;

function releaseAttention() {
  if (!mainWindow) {
    return;
  }

  if (attentionTimer) {
    clearTimeout(attentionTimer);
    attentionTimer = null;
  }

  mainWindow.flashFrame(false);
  mainWindow.setAlwaysOnTop(false);
}

function requestAttention() {
  if (!mainWindow) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
  mainWindow.flashFrame(true);
  mainWindow.setAlwaysOnTop(true, "floating");

  if (attentionTimer) {
    clearTimeout(attentionTimer);
  }

  // Give the prompt priority briefly, then return control even if the user ignores it.
  attentionTimer = setTimeout(releaseAttention, 15000);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    show: false,
    title: "Time Tracker App",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../frontend/dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("prompt:request-attention", () => {
  requestAttention();
});

ipcMain.handle("prompt:release-attention", () => {
  releaseAttention();
});

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
