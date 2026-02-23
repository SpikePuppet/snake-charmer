# Architecture

How Snake Charmer was built and how it all fits together. Written for future maintainers who want to understand the decisions behind the code.

## Origin & Evolution

### Phase 1: Tutorial Viewer (Initial Build)

The project started as a single-purpose Python tutorial viewer. The goal was to take the Sphinx-generated HTML from CPython's documentation and present it in a modern, polished reading experience — something closer to Stripe's docs than the default Sphinx theme.

**Key decisions in this phase:**
- **Bun as the sole runtime** — no Node.js, no npm scripts, no Vite. Bun handles the server (`Bun.serve()`), TypeScript compilation, JSX bundling, and hot reload. This eliminated an entire layer of build tooling.
- **Server-side content extraction at startup** — rather than serving raw Sphinx HTML or building a static site, the server reads all tutorial HTML files on boot, extracts the body content, rewrites internal links, builds a table of contents, and stores everything in memory as JSON. This gives us a clean API that the frontend consumes.
- **React SPA with client-side routing** — the frontend is a single-page app that manages routing via `history.pushState`. No React Router — just a regex that parses `/:version/:section/:slug` from the URL.
- **Hardcoded chapter list** — the 16 tutorial chapters are defined as a static array in `chapters.ts`. This was simple and sufficient for a single section.
- **CSS custom properties for theming** — all colors defined as variables in `:root`. No Tailwind, no CSS-in-JS. This made the later theme toggle trivial to add.

The data flow established in this phase remains the backbone of the app:
```
docs/ HTML files
    → extractAllContent() parses at startup
    → In-memory Maps serve API requests
    → React frontend fetches + caches + renders
```

### Phase 2: Dark/Light Theme + Content Width Toggle

A plan was developed to add two user preferences: a dark/light theme toggle and a narrow/wide content width toggle, both persisted in localStorage.

**Implementation approach (from the plan):**

1. **`usePreferences` hook** — reads theme and content-width from localStorage, applies `data-theme` and `data-width` attributes on `document.documentElement`, returns toggle functions. This decouples preference state from any single component.

2. **CSS `[data-theme="light"]` overrides** — rather than maintaining two separate stylesheets, light mode is implemented as attribute-selector overrides in the same CSS files. Dark is the default; light overrides the CSS variables. This approach was chosen because:
   - All four stylesheets already used `var(--bg-*)`, `var(--text-*)` variables
   - Adding `[data-theme="light"]` blocks at the end of each file keeps related styles together
   - No JavaScript needed for style switching — the browser handles it via CSS specificity

3. **Content width** — `[data-width="wide"] { --content-max: 920px; }` — a single CSS rule. Works everywhere because `.content-wrapper` and `.chapter-nav` already reference `--content-max`.

4. **Light syntax theme** — a complete set of Pygments token color overrides in `code.css`. The dark theme uses vibrant colors on dark backgrounds (GitHub Dark-inspired); the light theme uses darker saturated colors (GitHub Light-inspired).

5. **Sidebar footer controls** — the width and theme toggle buttons were added to the sidebar footer alongside the existing Cmd+K search hint. On mobile, the theme toggle was added to `MobileHeader`.

**Design considerations from the plan:**
- The mobile header bg was changed from hardcoded `rgba(8,9,13,0.88)` to a theme-aware value
- Admonition boxes needed slightly stronger tints in light mode for visual clarity
- The `body::before` gradient overlay was adjusted for light mode
- Search dialog box-shadow was softened for light mode

### Phase 3: Multi-Section Support (Tutorial + Reference + Library)

The most architecturally significant change. The app was extended from a single-section tutorial viewer to a three-section documentation viewer: Tutorial, Language Reference, and Standard Library.

**The challenge:** The tutorial has 16 chapters with a known, static order. The language reference has 10. The standard library has ~325 pages that need to be auto-discovered, titled, and ordered.

**Architecture changes:**

1. **Section concept throughout the stack** — a `Section` type (`"tutorial" | "reference" | "library"`) was added and threaded through every layer:
   - Backend: API routes changed from `/api/:version/chapters/:slug` to `/api/:version/:section/chapters/:slug`
   - Frontend routing: `/:version/tutorial/:slug` → `/:version/:section/:slug`
   - Data structure: `Map<version, Map<slug, ChapterData>>` → `Map<version, Map<section, Map<slug, ChapterData>>>`
   - All component props, hooks, and callbacks gained a `section` parameter

2. **Chapter discovery strategy** — two approaches coexist:
   - **Static chapters** (tutorial, reference): hardcoded arrays in `chapters.ts`. These sections have a small, stable number of chapters with a known order.
   - **Auto-discovered chapters** (library): `discoverLibraryChapters()` reads all HTML files from the directory, extracts titles from `<title>` tags, and orders them by parsing the TOC links in `index.html`. Pages not listed in the index are sorted alphabetically at the end.

3. **Link rewriting generalization** — the original link rewriter only handled tutorial-internal links. The new version:
   - Rewrites same-section links: `href="foo.html"` → `/:version/:section/foo`
   - Rewrites cross-section links: `href="../library/bar.html"` → `/:version/library/bar` (checks if target section exists in `SECTIONS`)
   - Falls back to `docs.python.org` for unknown paths

4. **Sidebar section tabs** — a segmented control at the top of the sidebar lets users switch between Tutorial, Language, and Library. Switching sections navigates to that section's default page (defined in `SECTIONS`). The brand text updates dynamically.

5. **Section-scoped search** — the search index is keyed by `version/section`. Search queries only return results from the current section. The search placeholder text updates to reflect the current section.

6. **Conditional UI** — library pages don't show chapter numbers (they're auto-generated and not meaningful). The content header shows "Standard Library" instead of "Chapter N". Previous/next nav cards omit numbers for library.

**Why not a single flat namespace?** Slugs can collide across sections (e.g., `introduction` exists in both tutorial and reference). The section prefix keeps them unambiguous.

**Memory considerations:** Loading ~350 pages into memory at startup is fast and keeps the API simple (no disk I/O on requests). The server starts in a few seconds even with all sections loaded.

### Phase 4: About Page & Project Rename

Two changes in this phase: adding a static About page (the first non-doc route), and renaming the project from "Prettify Python" to "Snake Charmer".

**About page — routing approach:**

The existing router only understood `/:version/:section/:slug` doc routes. Rather than introducing a full routing library, the `parseRoute()` function was extended with a simple path check before the doc regex:

1. `parseRoute()` returns an `about: boolean` alongside the existing version/section/slug fields. When the path is `/about`, it returns `about: true` with default doc values (so the sidebar still has valid state).
2. `App.tsx` gained a `handleAbout()` callback that pushes `/about` to history and sets `about: true` in route state. The existing `handleNavigate()` resets `about: false`.
3. Browser back/forward works because the `popstate` listener calls `parseRoute()`, which re-evaluates the path.

This keeps the routing logic minimal — no routing library, no route config object, just one additional branch before the regex.

**About page — rendering:**

`Layout.tsx` conditionally renders `AboutPage` vs `ContentArea`/`ChapterNav` based on the `about` prop. When on the about page, `TableOfContents` is also hidden (no headings to track). The sidebar, search, and footer remain visible, so navigating back to docs is always one click away.

`AboutPage.tsx` is a static component that reuses existing classes (`content-wrapper`, `chapter-header`, `chapter-title`) so it looks native in the content column. Styles specific to the about body (paragraphs, headings, links) are in `layout.css` under `.about-body`.

**Discoverability:** The about page is linked from two places:
- An info-circle (ⓘ) button in the sidebar footer, next to the existing width/theme toggles. Uses the same `sidebar-control-btn` styling and highlights active when on the about page.
- An "About" text link in the content footer.

Both use client-side navigation via `onAbout` (no full page reload).

**Project rename:** "Prettify Python" → "Snake Charmer" across `package.json` (`name` field), `index.html` (`<title>`, meta description), `AboutPage.tsx`, `CLAUDE.md`, `README.md`, and `architecture.md`. The directory name on disk was not changed.

### Phase 5: PostHog Analytics

Added custom event tracking using PostHog (`@posthog/react`). The provider was already wrapping `<App>` — this phase added `posthog.capture()` calls at key interaction points and fixed the environment variable plumbing.

**Events tracked:**

| Event | Properties | Location |
|---|---|---|
| `chapter_viewed` | `version`, `section`, `slug` | `App.tsx` — `handleNavigate` |
| `section_changed` | `version`, `section` | `Sidebar.tsx` — `handleSectionChange` |
| `search_executed` | `version`, `section`, `query`, `result_count` | `SearchDialog.tsx` — after results arrive |
| `search_result_selected` | `version`, `section`, `slug`, `query` | `SearchDialog.tsx` — `handleSelect` |
| `theme_toggled` | `theme` (new value) | `Layout.tsx` — theme button click |
| `width_toggled` | `width` (new value) | `Layout.tsx` — width button click |

Each component calls `usePostHog()` from `@posthog/react` to get the PostHog client. Events are fired inline at the point of interaction — no abstraction layer or analytics service.

**Cookieless mode:** PostHog is configured with `cookieless_mode: "always"` in the provider options. This means no cookies or localStorage for user identification — each page load gets a fresh anonymous ID. Events and their properties are unaffected; only cross-session user linkage is lost.

**Environment variables for the frontend:** Bun auto-loads `.env` into `process.env` on the server, but frontend code bundled via HTML imports needs explicit configuration. The `bunfig.toml` file at the project root declares `[serve.static] env = "PUBLIC_*"`, which tells Bun's static bundler to inline any `process.env.PUBLIC_*` references in frontend code with their actual values at bundle time. This works in both development and production.

The two PostHog env vars:
- `PUBLIC_POSTHOG_KEY` — project API key
- `PUBLIC_POSTHOG_HOST` — ingest endpoint (e.g. `https://us.i.posthog.com`)

**Why `PUBLIC_*` prefix, not `VITE_PUBLIC_*`?** The original code used `import.meta.env.VITE_PUBLIC_*`, which is a Vite convention. Bun doesn't recognize the `VITE_PUBLIC_` prefix or `import.meta.env` in HTML import bundles. Bun's convention is `process.env.PUBLIC_*` with the prefix configured in `bunfig.toml`.

## System Architecture

### Server (`src/server.ts`)

```
Startup:
  discoverVersions()       → scan docs/ for version directories
  extractAllContent()      → parse HTML for all versions × sections
  SearchIndex.build()      → index plain text for search
  Build chapter lists      → pre-sort for API responses

Runtime:
  GET /api/versions                          → version list
  GET /api/sections                          → section metadata
  GET /api/:version/:section/chapters        → chapter list
  GET /api/:version/:section/chapters/:slug  → chapter JSON
  GET /api/:version/:section/search?q=       → search results
  GET /*                                     → SPA HTML
```

### Documentation Setup (`scripts/setup-docs.ts`)

Before the server can start, the raw Sphinx HTML must be downloaded from `docs.python.org`. This is handled by `bun run setup`, which runs `scripts/setup-docs.ts`.

```
bun run setup [versions...] [--force]

Examples:
  bun run setup              → downloads 3.14 (default)
  bun run setup 3.13 3.14    → downloads both versions
  bun run setup --force 3.14 → re-downloads even if already present
```

**How it works:**

1. Each Python version's docs are published as a zip archive at `https://docs.python.org/<version>/archives/python-<version>-docs-html.zip`.
2. The script fetches the zip, writes it to `docs/`, extracts it with `unzip`, and renames the extracted directory from `python-<version>-docs-html/` to just `<version>/` (e.g., `docs/3.14/`).
3. The zip file is deleted after extraction.
4. If `docs/<version>/tutorial/index.html` already exists, the version is skipped unless `--force` is passed.

**Result:** a `docs/` directory (gitignored) containing one subdirectory per version, each with the full Sphinx HTML output:

```
docs/
  3.14/
    tutorial/       ← 16 HTML files
    reference/      ← 10 HTML files
    library/        ← ~325 HTML files
    ...             ← other Sphinx output (not used by the app)
```

This directory is the input to the server's startup pipeline — `discoverVersions()` scans it for version directories, and `extractAllContent()` reads the HTML files from the `tutorial/`, `reference/`, and `library/` subdirectories.

### Content Pipeline (`src/content/`)

```
Raw Sphinx HTML
  → extractBody()        Strip Sphinx chrome, keep <div class="body"> content
  → rewriteLinks()       Convert relative hrefs to app routes
  → extractToc()         Parse <section id="..."><h2> into TOC entries
  → stripHtml()          Generate plain text for search indexing
  → ChapterData          JSON-serializable object with html, toc, plainText, prev/next
```

### Frontend Architecture (`src/frontend/`)

```
App.tsx (routing: doc routes + /about)
  └── Layout.tsx (shell, conditional on `about` prop)
        ├── MobileHeader     ← section title, theme toggle, search, menu
        ├── Sidebar           ← section tabs, version select, chapter list
        ├── AboutPage         ← static about page (when about=true)
        ├── ContentArea       ← Sphinx HTML rendering, link interception (when about=false)
        ├── ChapterNav        ← previous/next cards (when about=false)
        ├── TableOfContents   ← right sidebar, scroll tracking (when about=false)
        └── SearchDialog      ← Cmd+K modal
```

**State management:** No Redux, no Context. Each component manages its own state via hooks. Cross-component coordination happens through prop drilling from `Layout.tsx`. This is sufficient because the component tree is shallow (Layout → children, max 2 levels).

**Data fetching pattern:** `useChapter` hook with:
- In-memory `Map` cache (never evicted — page count is bounded)
- Automatic prefetching of the next chapter
- `AbortController` for request cancellation on rapid navigation

### CSS Architecture

```
globals.css    ← :root variables, [data-theme="light"] overrides, resets
layout.css     ← Shell components, responsive breakpoints
content.css    ← Sphinx HTML typography, admonitions, tables
code.css       ← Pygments syntax tokens (dark + light)
```

**Theming mechanism:**
1. `usePreferences` sets `data-theme="light"` on `<html>`
2. CSS `[data-theme="light"] { --bg-root: #f5f3ef; ... }` overrides variables
3. Components use `var(--bg-root)` etc. — no theme logic in JavaScript
4. Hardcoded colors (inline code, syntax tokens) get explicit `[data-theme="light"]` overrides

**Responsive strategy:**
- `>= 1280px`: sidebar + content + TOC (three-column)
- `>= 1024px`: sidebar + content (two-column), TOC hidden
- `< 1024px`: mobile header + slide-out sidebar, full-width content

## Key Files Reference

| File | Responsibility | Key exports |
|------|---------------|-------------|
| `bunfig.toml` | Bun config | `[serve.static] env = "PUBLIC_*"` for frontend env var inlining |
| `setup-docs.ts` | Download Python docs | `downloadVersion()`, CLI arg parsing |
| `chapters.ts` | Section/chapter definitions | `SECTIONS`, `TUTORIAL_CHAPTERS`, `REFERENCE_CHAPTERS`, `discoverLibraryChapters()` |
| `extractor.ts` | HTML → JSON pipeline | `extractAllContent()`, `ChapterData`, `TocEntry` |
| `search-index.ts` | Full-text search | `SearchIndex` class |
| `versions.ts` | Version discovery | `discoverVersions()`, `getDocsDir()` |
| `App.tsx` | Client routing | `parseRoute()`, route state, `handleAbout()` |
| `Layout.tsx` | Component orchestrator | Composes all components, conditional about/doc rendering |
| `AboutPage.tsx` | Static about page | Project info, author, license |
| `Sidebar.tsx` | Navigation | Section tabs, chapter list, version select |
| `ContentArea.tsx` | Content display | HTML rendering, link interception |
| `useChapter.ts` | Data fetching | Caching, prefetching, abort handling |
| `usePreferences.ts` | User preferences | Theme/width toggles, localStorage |
| `globals.css` | Design tokens | All CSS custom properties |

## Design Decisions & Trade-offs

### Why in-memory content, not on-demand?
The total documentation is a few hundred MB of HTML. Extracting and storing it all at startup means zero disk I/O per request, instant API responses, and simple code. The trade-off is a ~3 second startup time and higher baseline memory usage, which is acceptable for a documentation site.

### Why no React Router?
The routing needs are simple: parse `/:version/:section/:slug` from the URL, plus a `/about` special case. A regex, one path check, and `history.pushState` handle this in ~20 lines. Adding React Router would bring a dependency and more complex configuration for no practical benefit. The `/about` route was added without increasing complexity — just one `if` branch before the doc regex.

### Why vanilla CSS instead of Tailwind?
The design system has a small, well-defined set of tokens (colors, fonts, spacing). CSS custom properties handle theming elegantly. Tailwind would add build complexity and make the theme toggle harder (you'd need `dark:` variants everywhere instead of clean `[data-theme]` overrides).

### Why not SSR/SSG?
The content doesn't change at runtime, so SSR provides no SEO benefit (search engines index docs.python.org, not this app). SSG would work but would require a build step — the current architecture is simpler: one process, one command, everything in memory.

### Why auto-discover library pages instead of hardcoding?
The standard library has ~325 pages that change between Python versions. Hardcoding them would be fragile and tedious. Auto-discovery from the filesystem with ordering from `index.html` handles version differences automatically.

## Future Considerations

- **Cross-section search** — currently search is scoped to the active section. A global search across all sections could be useful.
- **Sidebar filtering** — the library section has ~325 items. A filter/search within the sidebar chapter list would improve navigation.
- **URL-based theme** — currently theme is localStorage-only. A URL parameter (`?theme=light`) could be useful for sharing links with a preferred theme.
- **Additional sections** — the `SECTIONS` array and auto-discovery infrastructure make it straightforward to add `howto/`, `faq/`, `using/`, or other CPython doc sections.
- **Multiple Python version docs** — adding more versions just requires dropping HTML into `docs/<version>/`. No code changes needed.
