const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("markdownViewer", {
  openMarkdownFile: () => ipcRenderer.invoke("open-markdown-file"),
  onFileOpened: (callback) => {
    ipcRenderer.on("markdown-file-opened", (_event, payload) => callback(payload));
  },
});
