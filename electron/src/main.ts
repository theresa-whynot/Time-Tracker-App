import { app, BrowserWindow, ipcMain, nativeImage, screen, shell } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;
let widgetWindow: BrowserWindow | null = null;
let attentionTimer: NodeJS.Timeout | null = null;

const devServerUrl = process.env.ELECTRON_START_URL;
const widgetBounds = {
  expanded: {
    width: 340,
    height: 190,
  },
  collapsed: {
    width: 220,
    height: 58,
  },
  margin: 18,
};
let widgetCollapsed = false;

function createClockIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="bg" x1="38" y1="26" x2="224" y2="236">
          <stop stop-color="#3f3f46"/>
          <stop offset="0.52" stop-color="#18181b"/>
          <stop offset="1" stop-color="#09090b"/>
        </linearGradient>
        <linearGradient id="accent" x1="74" y1="42" x2="190" y2="220">
          <stop stop-color="#fb7185"/>
          <stop offset="1" stop-color="#b91c1c"/>
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="58" fill="url(#bg)"/>
      <circle cx="128" cy="128" r="86" fill="#27272a" stroke="url(#accent)" stroke-width="16"/>
      <circle cx="128" cy="128" r="62" fill="#18181b" opacity="0.58"/>
      <path d="M128 72v60l42 28" fill="none" stroke="#fafafa" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="128" cy="128" r="10" fill="#fb7185"/>
      <path d="M71 203c21 18 48 28 78 24 42-5 74-35 87-74" fill="none" stroke="#ef4444" stroke-width="10" stroke-linecap="round" opacity="0.32"/>
    </svg>
  `;

  return nativeImage.createFromDataURL(
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
  );
}

const clockIcon = createClockIcon();

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

  const currentBounds = widgetCollapsed ? widgetBounds.collapsed : widgetBounds.expanded;
  const { workArea } = screen.getPrimaryDisplay();
  widgetWindow.setBounds({
    width: currentBounds.width,
    height: currentBounds.height,
    x: workArea.x + workArea.width - currentBounds.width - widgetBounds.margin,
    y: workArea.y + workArea.height - currentBounds.height - widgetBounds.margin,
  });
}

function setWidgetCollapsed(collapsed: boolean) {
  widgetCollapsed = collapsed;
  positionWidgetWindow();
}

function broadcastTimerChanged() {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("timer:changed");
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
    icon: clockIcon,
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
    width: widgetBounds.expanded.width,
    height: widgetBounds.expanded.height,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    movable: false,
    alwaysOnTop: true,
    icon: clockIcon,
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

ipcMain.handle("timer:changed", () => {
  broadcastTimerChanged();
});

ipcMain.handle("widget:set-collapsed", (_event, collapsed: boolean) => {
  setWidgetCollapsed(collapsed);
});

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    app.dock?.setIcon(clockIcon);
  }

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
