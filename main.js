const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const { execFile } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { promisify } = require("node:util");

let mainWindow;
let pendingFilePath = findMarkdownPath(process.argv.slice(1));
const execFileAsync = promisify(execFile);

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

async function registerMarkdownFileAssociations() {
  if (process.platform !== "darwin" || !app.isPackaged) return;

  const appBundlePath = path.dirname(path.dirname(path.dirname(process.execPath)));
  const bundleId = "com.windvix.markdownviewer";

  try {
    await execFileAsync(
      "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister",
      ["-f", appBundlePath],
    );

    await execFileAsync("/usr/bin/osascript", [
      "-l",
      "JavaScript",
      "-e",
      `
        ObjC.import("CoreServices");
        const bundleId = "${bundleId}";
        const role = $.kLSRolesAll;
        [
          "net.daringfireball.markdown",
          "public.markdown"
        ].forEach((contentType) => {
          $.LSSetDefaultRoleHandlerForContentType(contentType, role, bundleId);
        });
      `,
    ]);
  } catch (error) {
    console.warn("Unable to register Markdown file associations:", error.message);
  }
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

  app.whenReady().then(() => {
    registerMarkdownFileAssociations();
    createWindow();
  });
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
