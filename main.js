const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

let mainWindow;
let pendingFilePath = findMarkdownPath(process.argv.slice(1));

function findMarkdownPath(args) {
  return args.find((arg) => /\.(md|markdown|txt)$/i.test(arg));
}

async function readMarkdownFile(filePath) {
  const markdown = await fs.readFile(filePath, "utf8");
  return {
    markdown,
    title: path.basename(filePath),
    path: filePath,
  };
}

async function sendFileToWindow(filePath) {
  if (!hasUsableWindow() || !filePath) return;

  try {
    const payload = await readMarkdownFile(filePath);
    if (!hasUsableWindow()) {
      pendingFilePath = filePath;
      return;
    }

    mainWindow.webContents.send("markdown-file-opened", payload);
  } catch (error) {
    dialog.showErrorBox("无法打开文件", error.message);
  }
}

function hasUsableWindow() {
  return mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed();
}

function focusMainWindow() {
  if (!hasUsableWindow()) return;

  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
}

function openFileWhenReady(filePath) {
  if (!filePath) return;

  pendingFilePath = filePath;

  if (!hasUsableWindow()) {
    if (app.isReady()) createWindow();
    return;
  }

  focusMainWindow();
  sendFileToWindow(pendingFilePath);
  pendingFilePath = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 820,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: "#f5f7f9",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadFile("index.html");
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.once("did-finish-load", () => {
    sendFileToWindow(pendingFilePath);
    pendingFilePath = null;
  });
}

const hasLock = app.requestSingleInstanceLock();

if (!hasLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const filePath = findMarkdownPath(argv);
    openFileWhenReady(filePath);
  });

  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    openFileWhenReady(filePath);
  });

  app.whenReady().then(createWindow);
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle("open-markdown-file", async () => {
  const result = await dialog.showOpenDialog(hasUsableWindow() ? mainWindow : null, {
    title: "打开 Markdown 文件",
    properties: ["openFile"],
    filters: [
      { name: "Markdown", extensions: ["md", "markdown", "txt"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return readMarkdownFile(result.filePaths[0]);
});
