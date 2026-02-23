# 🐍 Prettify Python

A modern, beautifully styled Python documentation viewer. Takes the official CPython Sphinx HTML docs and presents them in a clean, dark-themed (or light!) reading experience with instant search, keyboard navigation, and a responsive design that works great on everything from phones to ultrawide monitors.

![Dark theme](https://img.shields.io/badge/theme-dark-1a1b24?style=flat-square) ![Light theme](https://img.shields.io/badge/theme-light-f5f3ef?style=flat-square) ![Bun](https://img.shields.io/badge/runtime-bun-f9f1e1?style=flat-square&logo=bun)

## ✨ Features

- 📚 **Three doc sections** — Tutorial, Language Reference, and Standard Library (~350 pages!)
- 🔍 **Instant search** — Hit `Cmd+K` to search within the current section
- 🌙 **Dark & light themes** — Toggle with one click, persisted across sessions
- 📐 **Content width toggle** — Switch between comfortable (720px) and wide (920px) reading
- ⚡ **Blazing fast** — Bun server, in-memory content, prefetches the next chapter
- 📱 **Fully responsive** — Sidebar collapses on mobile, everything stays readable
- 🔗 **Smart link rewriting** — Internal links between sections work natively
- 📖 **Table of contents** — Right sidebar tracks your scroll position
- ⌨️ **Keyboard navigation** — Arrow keys in search, Escape to close

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- Python docs HTML (already included for 3.14)

### Install & Run

```sh
# Install dependencies
bun install

# Start dev server with hot reload
bun --hot src/server.ts

# Or use the npm script
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

### Production

```sh
bun run start
```

## 🗂️ Project Structure

```
prettify-python/
├── src/
│   ├── server.ts              # 🖥️  Bun server + API routes
│   ├── content/               # 📄 Content extraction pipeline
│   │   ├── chapters.ts        #     Section & chapter definitions
│   │   ├── extractor.ts       #     Sphinx HTML → JSON
│   │   ├── search-index.ts    #     Full-text search engine
│   │   └── versions.ts        #     Python version discovery
│   └── frontend/              # ⚛️  React SPA
│       ├── App.tsx             #     Root + client-side routing
│       ├── components/         #     UI components
│       ├── hooks/              #     Custom React hooks
│       ├── lib/                #     Types
│       └── styles/             #     CSS (dark + light themes)
└── docs/                      # 📚 Python documentation HTML
    └── 3.14/
        ├── tutorial/           #     16 chapters
        ├── reference/          #     10 chapters
        └── library/            #     ~325 module pages
```

## 🎨 Themes

Toggle between dark and light mode using the sun/moon button in the sidebar footer (desktop) or mobile header.

**Dark mode** — Deep midnight blues with vibrant syntax highlighting. Easy on the eyes for late-night reading sessions.

**Light mode** — Warm paper tones with refined typography. Great for daytime use and printing.

Both themes have fully styled:
- 📝 Inline code and code blocks with custom syntax highlighting
- 💡 Admonition boxes (notes, tips, warnings, danger)
- 📊 Tables with alternating row colors
- 🔍 Search dialog
- 📑 Sidebar and navigation

## 🔧 Adding More Python Versions

Drop the Sphinx HTML build output into `docs/<version>/`:

```sh
# Example: adding Python 3.15 docs
cp -r /path/to/cpython/Doc/build/html/tutorial docs/3.15/tutorial
cp -r /path/to/cpython/Doc/build/html/reference docs/3.15/reference
cp -r /path/to/cpython/Doc/build/html/library docs/3.15/library
```

Restart the server — the new version appears automatically in the version selector! 🎊

## 🛠️ Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Runtime | [Bun](https://bun.sh) | Fast startup, built-in bundler, TypeScript native |
| Server | `Bun.serve()` | Zero-dependency HTTP with routing |
| Frontend | React 19 | Component model, hooks |
| Styling | Vanilla CSS | Custom properties, no framework overhead |
| Fonts | Google Fonts | Outfit, DM Sans, JetBrains Mono |

No webpack. No Vite. No Express. No Tailwind. Just Bun and good CSS. 🧹

## 📝 License

This project reskins the official [Python documentation](https://docs.python.org/), which is licensed under the [PSF License](https://docs.python.org/3/license.html).
