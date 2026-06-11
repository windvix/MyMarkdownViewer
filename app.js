const preview = document.querySelector("#preview");
const emptyState = document.querySelector("#emptyState");
const dropZone = document.querySelector("#dropZone");
const documentTitle = document.querySelector("#documentTitle");
const documentMeta = document.querySelector("#documentMeta");
const toast = document.querySelector("#toast");
const fileInput = document.querySelector("#fileInput");
const openFileButton = document.querySelector("#openFileButton");
const emptyOpenButton = document.querySelector("#emptyOpenButton");
const copyHtmlButton = document.querySelector("#copyHtmlButton");
const downloadButton = document.querySelector("#downloadButton");
const themeButton = document.querySelector("#themeButton");
const sampleButton = document.querySelector("#sampleButton");

const THEME_KEY = "markdown-viewer.theme";
const LAST_DOCUMENT_KEY = "markdown-viewer.lastDocument";
const LAST_TITLE_KEY = "markdown-viewer.lastTitle";

const sampleMarkdown = `# 像 AI 回复一样阅读 Markdown

这是一份只读 Markdown 示例。它的重点不是编辑，而是让文档像一条清爽的 AI 回复一样自然展开：段落有呼吸感，列表容易扫读，代码块不会压过正文。

## 排版细节

- 正文宽度被限制在舒适阅读范围内
- 标题层级清楚，但不会显得像营销页面
- 引用、表格、任务列表和代码块都保留 Markdown 的原始气质

> Markdown 查看器最重要的事，是让内容本身站到前面。

## 代码块

\`\`\`js
function renderMarkdown(source) {
  const html = marked.parse(source);
  return DOMPurify.sanitize(html);
}
\`\`\`

## 表格

| 元素 | 效果 |
| --- | --- |
| 段落 | 像对话消息一样舒展 |
| 代码 | 高亮并支持复制 |
| 文件 | 打开或拖入即可查看 |
`;

marked.setOptions({
  gfm: true,
  breaks: true,
});

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("visible");
  }, 1800);
}

function getDocumentMeta(markdown) {
  const plainText = markdown
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[`*_>#\-[\]()|]/g, "")
    .trim();
  const characters = plainText.length;
  const lines = markdown ? markdown.split(/\r\n|\r|\n/).length : 0;
  return `${characters} 字 · ${lines} 行`;
}

function enhanceCodeBlocks() {
  preview.querySelectorAll("pre").forEach((pre) => {
    const codeElement = pre.querySelector("code");
    if (codeElement) hljs.highlightElement(codeElement);
    if (pre.querySelector(".copy-code")) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy-code";
    button.title = "复制代码";
    button.setAttribute("aria-label", "复制代码");
    button.innerHTML = '<i data-lucide="copy"></i>';
    button.addEventListener("click", async () => {
      const code = pre.querySelector("code")?.innerText ?? "";
      await navigator.clipboard.writeText(code);
      showToast("代码已复制");
    });
    pre.append(button);
  });

  lucide.createIcons();
}

function renderMarkdown(markdown, title) {
  const rawHtml = marked.parse(markdown);
  preview.innerHTML = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ["target"],
  });
  preview.querySelectorAll("a[href]").forEach((link) => {
    link.target = "_blank";
    link.rel = "noreferrer";
  });
  enhanceCodeBlocks();

  preview.classList.remove("hidden");
  emptyState.classList.add("hidden");
  documentTitle.textContent = title || "Markdown Viewer";
  documentMeta.textContent = getDocumentMeta(markdown);
  localStorage.setItem(LAST_DOCUMENT_KEY, markdown);
  localStorage.setItem(LAST_TITLE_KEY, title || "Markdown Viewer");
}

function renderEmpty() {
  preview.innerHTML = "";
  preview.classList.add("hidden");
  emptyState.classList.remove("hidden");
  documentTitle.textContent = "Markdown Viewer";
  documentMeta.textContent = "打开或拖入 Markdown 文件";
  lucide.createIcons();
}

function openPicker() {
  if (window.markdownViewer) {
    window.markdownViewer.openMarkdownFile().then((payload) => {
      if (payload) renderMarkdown(payload.markdown, payload.title);
    });
    return;
  }

  fileInput.click();
}

function loadFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const markdown = String(reader.result ?? "");
    renderMarkdown(markdown, file.name);
    showToast(`已打开 ${file.name}`);
  });
  reader.readAsText(file);
}

function copyPreviewHtml() {
  if (!preview.innerHTML.trim()) {
    showToast("当前没有可复制的内容");
    return;
  }
  navigator.clipboard.writeText(preview.innerHTML).then(() => {
    showToast("HTML 已复制");
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function getTextFile(path) {
  const response = await fetch(path);
  return response.ok ? response.text() : "";
}

async function downloadHtml() {
  if (!preview.innerHTML.trim()) {
    showToast("当前没有可导出的内容");
    return;
  }

  const [stylesheet, highlightStylesheet] = await Promise.all([
    getTextFile("./styles.css"),
    getTextFile("./node_modules/@highlightjs/cdn-assets/styles/github.min.css"),
  ]);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(documentTitle.textContent)}</title>
  <style>${highlightStylesheet}</style>
  <style>${stylesheet}</style>
</head>
<body>
  <article class="markdown-body">${preview.innerHTML}</article>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "markdown-view.html";
  link.click();
  URL.revokeObjectURL(url);
  showToast("HTML 已导出");
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
  themeButton.innerHTML = theme === "dark" ? '<i data-lucide="sun"></i>' : '<i data-lucide="moon"></i>';
  lucide.createIcons();
}

openFileButton.addEventListener("click", openPicker);
emptyOpenButton.addEventListener("click", openPicker);
fileInput.addEventListener("change", () => {
  const [file] = fileInput.files;
  if (file) loadFile(file);
  fileInput.value = "";
});

sampleButton.addEventListener("click", () => {
  renderMarkdown(sampleMarkdown, "阅读示例.md");
  showToast("示例已打开");
});
copyHtmlButton.addEventListener("click", copyPreviewHtml);
downloadButton.addEventListener("click", downloadHtml);
themeButton.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (!file) return;
  loadFile(file);
});

applyTheme(localStorage.getItem(THEME_KEY) || "light");

if (window.markdownViewer) {
  window.markdownViewer.onFileOpened((payload) => {
    renderMarkdown(payload.markdown, payload.title);
  });
}

const lastDocument = localStorage.getItem(LAST_DOCUMENT_KEY);
if (lastDocument) {
  renderMarkdown(lastDocument, localStorage.getItem(LAST_TITLE_KEY) || "Markdown Viewer");
} else {
  renderEmpty();
}
