import { app, BrowserWindow, ipcMain, screen, shell } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;
let widgetWindow: BrowserWindow | null = null;
let attentionTimer: NodeJS.Timeout | null = null;

const devServerUrl = process.env.ELECTRON_START_URL;
const widgetBounds = {
  width: 340,
  height: 190,
  margin: 18,
};

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

function loadFrontend(window: BrowserWindow, view?: "widget") {
  if (devServerUrl) {
    const url = new URL(devServerUrl);
    if (view) {
      url.searchParams.set("view", view);
    }
    window.loadURL(url.toString());
    return;
  }

  window.loadFile(path.join(__dirname, "../../frontend/dist/index.html"), {
    query: view ? { view } : undefined,
  });
}

function positionWidgetWindow() {
  if (!widgetWindow) {
    return;
  }

  const { workArea } = screen.getPrimaryDisplay();
  widgetWindow.setBounds({
    width: widgetBounds.width,
    height: widgetBounds.height,
    x: workArea.x + workArea.width - widgetBounds.width - widgetBounds.margin,
    y: workArea.y + workArea.height - widgetBounds.height - widgetBounds.margin,
  });
}

function openMainPrompt() {
  if (!mainWindow) {
    createMainWindow();
  }

  requestAttention();
  const targetWindow = mainWindow;
  if (!targetWindow) {
    return;
  }

  if (targetWindow.webContents.isLoading()) {
    targetWindow.webContents.once("did-finish-load", () => {
      targetWindow.webContents.send("prompt:open");
    });
    return;
  }

  targetWindow.webContents.send("prompt:open");
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

  loadFrontend(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function createWidgetWindow() {
  widgetWindow = new BrowserWindow({
    width: widgetBounds.width,
    height: widgetBounds.height,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    movable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    title: "Time Tracker Widget",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  widgetWindow.setAlwaysOnTop(true, "floating");
  widgetWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  positionWidgetWindow();
  loadFrontend(widgetWindow, "widget");

  widgetWindow.on("closed", () => {
    widgetWindow = null;
  });
}

ipcMain.handle("prompt:request-attention", () => {
  requestAttention();
});

ipcMain.handle("prompt:release-attention", () => {
  releaseAttention();
});

ipcMain.handle("prompt:open", () => {
  openMainPrompt();
});

app.whenReady().then(() => {
  createMainWindow();
  createWidgetWindow();

  screen.on("display-metrics-changed", positionWidgetWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      createWidgetWindow();
    } else if (!mainWindow) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
