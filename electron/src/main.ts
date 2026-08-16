import { app, BrowserWindow, ipcMain, nativeImage, screen, shell } from "electron";
import path from "node:path";

let mainWindow: BrowserWindow | null = null;
let widgetWindow: BrowserWindow | null = null;
let attentionTimer: NodeJS.Timeout | null = null;

const devServerUrl = process.env.ELECTRON_START_URL;
const widgetBounds = {
  expanded: {
    width: 360,
    height: 230,
  },
  collapsed: {
    width: 220,
    height: 58,
  },
  margin: 18,
};
let widgetCollapsed = false;

function createClockIcon() {
  return nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAFF0lEQVR42u2dTW7cMAxGc4wA3SQBMgHaAm2PlvvmIEU2KbIo4LqyLVH8+Uh9BLQLJrbfI6nx2NLdHYPBYDAYDAaDwWCUioeHrx8zg1dwIdiUgsApRDXoj4/fpgZlSAR+FramFCTmAN0L+KwQJKkIfgTM09N3laElA8kagteCrSUFRVCCrwH97XYTDQ0ZKIEyeCvYWlJQhEn4o+CtgUuFGBGB4BOCpwjG8DNAH5GBEjTg92Z9FvBXIvRWg2XhVwEvEaG0BCvDX1qCnn5fHfyoCGXmBWjwn59/fNxuP7vG599SAuOybwl+BHakFCMSEP7F0AZ+NSgBAPyRTH95+TU0PCtDGQm84F+BbwG9v/8yNEalmBUhvQQe8M/AzwIfFcJChLQSeMDvAa8NvUcG7TlCSgks4R9lvRT6+/v76ZDKoFkNeiUoD18TvJUAPSKUleCs9CPCtxTAUwKYVtCT/RrwNXu8pQBXIsxIAFcFrEq/JXwvATQlgGwFVqW/BV97Bu8lwFYEKwnCWoFF6feAHyGAtgThVcAi+73gRwmgIQFMFcgMP1IALwnCsx8ZfrQAmhKEVAHN7N/f4fO6lRstQEuCkTuGoVXAKvs97+WjCLCXQLMKwGd/ROlHEmC2FYRUAa3sjyr9aAJotQIXAayy3/tnXEQBpK3AtQpoCRCd/WgCzFQBKAGk2e99sREFaEkA1QYqZX8WAaCqQKXsRxUAugpQAArwnwCj5T965p9FAIkErTagJoBW/0fJfmQBpFXAdB5QrfxXFMC0DWgIsJ39R5f/DAJsJRj9NgApAFL2owsw2wZcBMjc/6sLoDoRrDgBXEmAaQkqTgCrCmDSBiwmgNEXdyvA79fXfwaKAHsJwiaCFSeAn2MPfj/QBAibCFYU4Ao+igQUgAJQgCj4CBJQAApAAaIFyPbTMAUwEADlOUEK4CwB2uPiFABAgMhXxyiAowRXt4ojXiDlrWAHEXrAR7xGnvpWMGoVkPxIFLWkDOyPQZnbALIEUM8FVnwgxEqEcg+EVJ4IIlcD+EfCsj8UilwNSj4UmrkKeEuQ7rHw6m3AuyXAvRhS8dUw1GoA+WoY24BfNeDbwYtLkFaAbAtEILYE+GViWAVsq4Ek+//+hsFFopJLIMn+o18y4QWo9o1AQ4SZ7G+NsLUCsywUiSSBtPf3CMClYsFFkC4Ve/VAS+h6wRkWi0aRQPq1Lwx+leXiESSwKP3uAmTdMCJaBOvS77prSMYtY5De+NEq/S7ZX2XTqMrwQ3YOy7ZtXDb4UNlfYePIqvBDdw/NtHVs5NKv2vBDst+6FVSQYAn4lq3Acvv4CPCSrWJhS79XK8gmgSd8iOz3kmB/xxBNhDPwI7uApYV/1Qo0JDiqBlsRPGXY/s+j45Kc4wh8KAFGJfg8Ec1qsBfBQob95x8dhyTr08MfkWB7QtJqcCZCSwaJEK3POPufUvBl4PdI0Dox6UXrEeFKirPR+7kz4HvhQ/b9UQmuTnDmIp7NEazG7PGOLFiVCn5Lgt4Tnb2oksrglelLwZcKoCnBjBSasDXgpxRgRgJLEaLG6Pmnh08RCH55CQhfUYJMIkjOrTx8LQlQZZg5l2XgH90nmLl4kTLMHvf+OtytFpoSeMmgdZxLg7esBppSWBzL8lkfKULkIHiBBBVEaJ0TSS8gAsEbiYAsw9HxkmTxqkDoAFXBU4izYyAhEBk0xOj9fJJIJsTs4JVeSApeQQaDwWAwGAwGg1Er/gACmY1qy0naHgAAAABJRU5ErkJggg==",
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
    movable: true,
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
  app.setName("Time Tracker");
  if (process.platform === "win32") {
    app.setAppUserModelId("com.time-tracker.app");
  }

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
