# Markdown Viewer

A local read-only Markdown viewer with a clean AI-message-like reading style.

## Desktop app

Built Windows files are in `dist/`:

- `dist/Markdown Viewer Setup 0.1.0.exe`: installer build
- `dist/Markdown Viewer 0.1.0.exe`: portable build

Use the installer if you want Windows file association support. After installing,
right-click any `.md` file, choose "Open with", select Markdown Viewer, and set it
as the default app.

## Development

```bash
npm.cmd install
npm.cmd start
npm.cmd run dist
```

## Features

- Open `.md`, `.markdown`, and `.txt` files
- Open files by drag and drop
- Launch with a Markdown file path from Windows
- GitHub Flavored Markdown, tables, task lists
- Code highlighting and code block copy
- Copy rendered HTML
- Export standalone HTML
- Light and dark themes

The desktop build bundles the browser libraries locally, so viewing Markdown does
not require CDN access.
