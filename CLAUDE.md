# Snake Charmer — Developer Guide

## Quick Start

```sh
bun install
bun run setup              # downloads Python 3.14 docs (~16MB)
bun --hot src/server.ts    # dev server on port 3000
```

## Runtime

This project uses **Bun** exclusively. No Node.js, no npm, no Vite.

- `bun run setup` — download Python docs (required before first run)
- `bun --hot src/server.ts` — dev server with HMR
- `bun src/server.ts` — production start
- `bun test` — run tests
- `bun install` — install dependencies

The parent `~/Code/CLAUDE.md` has the full Bun conventions. Key points:
- `Bun.serve()` for the server (not express)
- `Bun.file()` for file reads (not fs.readFile)
- HTML imports for the frontend (not vite)
- Bun auto-loads `.env` (no dotenv)

## Project Structure

```
src/
  server.ts                       # Bun.serve() entry point, API routes
  content/
    chapters.ts                   # Section/chapter metadata, library auto-discovery
    extractor.ts                  # Sphinx HTML → JSON extraction pipeline
    search-index.ts               # Full-text search with scoring
    versions.ts                   # Python version discovery from docs/
  frontend/
    index.html                    # HTML entry (loads App.tsx, Google Fonts)
    App.tsx                       # Root component, client-side routing
    lib/
      types.ts                    # Shared TypeScript types
    hooks/
      useChapter.ts               # Chapter fetching + caching + prefetch
      usePreferences.ts           # Theme/width toggle, localStorage
      useActiveHeading.ts         # IntersectionObserver for TOC highlighting
    components/
      Layout.tsx                  # Shell: composes all components
      Sidebar.tsx                 # Section tabs, version select, chapter list
      ContentArea.tsx             # Sphinx HTML renderer, link interception
      ChapterNav.tsx              # Previous/Next navigation
      TableOfContents.tsx         # Right-side TOC with active heading
      SearchDialog.tsx            # Cmd+K search modal
      MobileHeader.tsx            # Mobile nav bar
    styles/
      globals.css                 # Design tokens, resets, dark/light themes
      layout.css                  # Shell layout, sidebar, search dialog
      content.css                 # Sphinx content typography
      code.css                    # Syntax highlighting (dark + light)
scripts/
  setup-docs.ts                   # Downloads Python docs from docs.python.org
bunfig.toml                         # Bun config: inlines PUBLIC_* env vars into frontend bundle
docs/                             # (gitignored, created by `bun run setup`)
  3.14/                           # Python 3.14 docs (Sphinx HTML output)
    tutorial/                     # 16 tutorial chapters
    reference/                    # 10 language reference chapters
    library/                      # ~325 standard library pages
```

## Key Concepts

### Sections

Three documentation sections: `tutorial`, `reference`, `library`. Defined in `chapters.ts` as `SECTIONS`. Tutorial and reference have hardcoded chapter lists. Library chapters are auto-discovered from the filesystem at startup.

### Data Flow

1. **Startup**: `extractAllContent()` reads all HTML files from `docs/`, extracts body content, rewrites links, builds TOC and plain text. Returns `Map<version, Map<section, Map<slug, ChapterData>>>`.
2. **Search index**: Built from extracted plain text, stored in memory.
3. **API**: Routes serve chapter lists, individual chapters, and search results.
4. **Frontend**: SPA with client-side routing (`/:version/:section/:slug`). `useChapter` hook fetches from API with caching and prefetching.

### Theming

CSS custom properties in `:root` (dark) and `[data-theme="light"]` (light). The `usePreferences` hook manages `data-theme` and `data-width` attributes on `<html>`, persisted in localStorage.

Content width toggle: `[data-width="wide"]` overrides `--content-max` from 720px to 920px.

### Link Rewriting

`extractor.ts` rewrites Sphinx links:
- Same-section links: `href="foo.html"` → `/:version/:section/foo`
- Cross-section links: `href="../library/bar.html"` → `/:version/library/bar`
- Unknown links: fall back to `docs.python.org`

The frontend (`ContentArea.tsx`) intercepts clicks on internal links and uses client-side navigation.

### Analytics (PostHog)

PostHog is integrated via `@posthog/react`. `App.tsx` wraps the app in `<PostHogProvider>` with cookieless mode (`cookieless_mode: "always"`). API key and host are read from `process.env.PUBLIC_POSTHOG_KEY` / `process.env.PUBLIC_POSTHOG_HOST`, inlined into the frontend bundle at build time via `bunfig.toml` (`[serve.static] env = "PUBLIC_*"`).

Custom events captured:

| Event | Properties | Location |
|---|---|---|
| `chapter_viewed` | `version`, `section`, `slug` | `App.tsx` — `handleNavigate` |
| `section_changed` | `version`, `section` | `Sidebar.tsx` — `handleSectionChange` |
| `search_executed` | `version`, `section`, `query`, `result_count` | `SearchDialog.tsx` — after results arrive |
| `search_result_selected` | `version`, `section`, `slug`, `query` | `SearchDialog.tsx` — `handleSelect` |
| `theme_toggled` | `theme` (new value) | `Layout.tsx` — theme button click |
| `width_toggled` | `width` (new value) | `Layout.tsx` — width button click |

### Environment Variables

Frontend env vars use the `PUBLIC_` prefix and are defined in `.env`:
- `PUBLIC_POSTHOG_KEY` — PostHog project API key
- `PUBLIC_POSTHOG_HOST` — PostHog ingest host (e.g. `https://us.i.posthog.com`)

These are inlined into the client bundle by Bun's static bundler via the `[serve.static] env = "PUBLIC_*"` config in `bunfig.toml`. Server-side env vars (S3 credentials, etc.) do not use the `PUBLIC_` prefix and are not exposed to the frontend.

## Adding a New Doc Section

1. Add entry to `SECTIONS` in `chapters.ts` with `id`, `label`, `dir`, `defaultSlug`
2. If hardcoded chapters: add a `const` array and update `getStaticChapters()`
3. If auto-discovered: the library path in `extractAllContent()` handles it automatically
4. The frontend picks up new sections from the sidebar tabs automatically (defined in `Sidebar.tsx`)

## Adding a New Python Version

Run `bun run setup <version>` (e.g., `bun run setup 3.13`). The version is auto-discovered at startup by `versions.ts`. Use `--force` to re-download an existing version.

## CSS Architecture

Four stylesheets, each scoped:
- `globals.css` — tokens, resets, animations, theme variables
- `layout.css` — shell components (sidebar, header, search, nav)
- `content.css` — Sphinx HTML content styling
- `code.css` — Pygments syntax highlighting

Light theme overrides use `[data-theme="light"]` selectors. Add overrides in the same file as the base styles.

## Common Tasks

### Change theme colors
Edit the `:root` block (dark) or `[data-theme="light"]` block in `globals.css`.

### Adjust sidebar width
Change `--sidebar-width` in `:root` in `globals.css`.

### Add a new content style
Style Sphinx-generated HTML classes in `content.css`. Add light override if the color is hardcoded.

### Debug content extraction
Add `console.log` in `extractor.ts` `extractBody()` or `rewriteLinks()`. Run `bun src/server.ts` and check terminal output.

### Test search
`curl "http://localhost:3000/api/3.14/library/search?q=datetime"`

## Conventions

- No external CSS frameworks (no Tailwind usage despite being in devDeps)
- All colors via CSS custom properties
- Font stack: Outfit (display), DM Sans (body), JetBrains Mono (code)
- Responsive breakpoints: 1024px (sidebar), 1280px (TOC), 640px (mobile)
- Component naming: PascalCase files, default exports
- Hook naming: `use*` prefix, named exports
