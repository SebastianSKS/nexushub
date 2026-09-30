<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Nexo

Windows 11 desktop app (Tauri 2) wrapping a **static export** of a Next.js 16 / React 19 app: YouTube, Spotify, 17 offline document tools, calendar, class schedule, calculator. No server, no accounts, no database — everything persists in `localStorage` + the Tauri filesystem. UI language: **Spanish is the source of truth**, English is a translation layer.

## Commands

```bash
npm run dev            # next dev on :3000 (predev copies OCR assets)
npm run check          # THE gate: typecheck -> i18n:check -> test, in that order
npm run build          # static export into out/ (prebuild + postbuild hooks, see below)
npm run tauri:dev      # desktop window against the dev server
```

- **There is no linter and no formatter.** Don't look for one, don't add one. `npm run typecheck` (`tsc --noEmit`) is the only static check.
- Single test: `node --import ./tests/alias.mjs --test tests/horario.test.ts`. Do **not** use `npm test -- <file>`: npm appends your file *after* the quoted glob in the script, so you silently run the whole suite too.
- Rust: `cargo check --manifest-path src-tauri/Cargo.toml --locked` / `cargo test --manifest-path src-tauri/Cargo.toml --locked`.
- CI (`.github/workflows/ci.yml`, Node 24) runs `typecheck -> i18n:check -> test -> build` on Linux, then feeds the `out/` artifact to a Windows job that runs the two cargo commands. Your change is fine when the full `npm run check` plus `npm run build` pass.
- Open the dev server at **`http://127.0.0.1:3000`**, never `localhost` — Spotify's redirect URI and `allowedDevOrigins` require `127.0.0.1`.

## Tests

`node:test` + `node:assert/strict`, files at `tests/<area>.test.ts` (Spanish names), `describe`/`it` titles in Spanish.

- Tests import source **directly with an explicit `.ts` extension** (`../src/lib/horario/horario.ts`); `tests/alias-hooks.mjs` teaches Node the `@/` alias and JSON imports. Nothing is compiled. Code reachable from a test must therefore use **erasable syntax only** — no `enum`, no `namespace`, no constructor parameter properties (the repo currently has none; keep it that way).
- Tests point at `src/lib/**` (pure logic, React-free — only `src/lib/i18n/index.ts` touches React). Business logic belongs there precisely so it can be tested without a DOM.
- Running `node scripts/...` from `scripts/` (release, i18n checks) imports `src/lib/*.ts` the same way.

## Architecture

`src/app/**` route files are thin server components that wrap a client `Pagina*` component in `<Suspense>`. All real UI lives in `src/modules/<seccion>/`.

| Path | Owns |
| --- | --- |
| `src/lib/` | Pure logic: dates, horario, ics, documents helpers, i18n. No React, no DOM. |
| `src/modules/<seccion>/` | Feature UI: `video`, `musica`, `documents`, `calendario`, `horario`, `inicio`, `calculadora`, `configuracion`, `carpetas`. |
| `src/components/fluent/` | Design-system primitives (Button, Dialog, Switch…). Use these, not raw elements. |
| `src/components/shell/` | App chrome: `Ventana`, `PlantillaPagina`, `PanelNavegacion`, `GlobalSearch`. |
| `src/services/` | I/O: documents pipeline, network, Tauri `invoke` wrappers. |
| `src/store/` | Zustand + `localStorage` (see below). |
| `src/hooks/` | React hooks. |
| `src/styles/tokens.css` | The only place colors exist. |
| `src/types/*.d.ts` | Ambient types for untyped third-party globals (YouTube iframe, Spotify SDK, mammoth). |
| `src-tauri/src/*.rs` | Rust side: commands registered in `lib.rs` `generate_handler!`; permissions in `capabilities/default.json`. |

### Static export constraints (`next.config.mjs`)

- Outside dev, `output: "export"`: **no server, no route handlers, no dynamic segments.** Ids that can't be enumerated travel as query params (`?id=`) — see `src/lib/rutas.ts`, which is the single source of truth for routes. `src/app/api/spotify/callback/page.tsx` is a *page*, not an API route.
- `trailingSlash: true` — routes end in `/` (`/documentos/unir-pdf/`).
- `rewrites` (CORS proxy for YouTube/Spotify) and `output: "export"` live in mutually exclusive branches: Next refuses to combine them. Keep that split.
- `postbuild` → `scripts/arreglar-exportacion.mjs` works around a Next 16 + static-export bug on Windows (nested `out/x/index.txt` vs the flat `out/x.txt` the client router requests). Without it every in-app navigation 404s and degrades to a full page reload. **Do not delete it.**
- `predev`/`prebuild` → `scripts/copiar-tesseract.mjs` copies ~14 MB of OCR assets from `node_modules` into `public/tesseract/`, which is gitignored. Never commit those.

### Desktop vs browser

One codebase, two hosts. `esEscritorio()` (`src/lib/entorno.ts`) detects `window.__TAURI_INTERNALS__`.

- In **components**, use the `useEsEscritorio()` hook — it returns `null` until mounted, and deciding earlier causes hydration mismatches. Same for anything that depends on "today": wrap it in `<SoloEnCliente>`.
- External links go through `abrirExterno()` (`src/lib/entorno.ts`). A plain `window.open` gets trapped inside the app window on desktop.
- **Network: never fetch an external host directly.** `src/lib/red.ts` routes through Tauri's HTTP plugin on desktop and the dev proxy in the browser. Adding a new host means adding it in **both** `PROXY_DEV` (`src/lib/red.ts`) and `rewrites` (`next.config.mjs`), or it works in dev and fails in the app.
- Tauri capabilities must be granted in `src-tauri/capabilities/default.json` for any new plugin/command.

## Conventions

- **Spanish everywhere**: identifiers (`useHorarioStore`, `aMinutos`, `deMinutos`), kebab-case filenames, JSDoc comments, and commit messages. Commits are imperative present tense, often prefixed with the area: `Versión 0.2.4`, `README: el horario se puede pasar a un compañero`.
- **No `dark:` variants.** Colors are CSS variables in `src/styles/tokens.css` exposed through `tailwind.config.ts`; light/dark is a `data-theme` switch. Never invent a color outside that palette.
- **Every page uses `PlantillaPagina`** (breadcrumb → title + single primary action → main panel + 320 px side panel). Don't invent a page layout.
- **Icons are `NombreGlifo`** from `src/lib/glifos.ts` (Segoe Fluent Icons), rendered by `src/components/fluent/Glifo.tsx`. No emoji, no inline SVG.
- **Stores**: `create<T>()(...)` + a `cargar()` that reads `localStorage` behind a `CLAVE = "nexushub-<area>"` constant, with `leer`/`escribir` wrapped in try/catch (storage can be blocked / hold corrupted JSON) and every item re-validated on read (see `horario-store.ts` + `claseValida`). No Zustand `persist` middleware.

### i18n — the strictest rule in the repo

The Spanish string **is** the translation key.

- Components: `const t = useT();` → `t("Guardar")`, `t("Hola, {nombre}", { nombre })`.
- Outside React: `traducir("Guardar")`.
- Data (lists, registries) can't call `t` at definition time: mark the string with `T("…")` (identity function) and render it with `t(dato)`. See `SECCIONES` in `src/lib/rutas.ts`.
- Same text meaning different things in different places gets a context suffix after `¦`: `"Cumpleaños¦grupo"`.
- **Every new user-facing string must get an English entry in the matching `src/lib/i18n/en/<seccion>.json`, with identical `{marcadores}`** — otherwise `npm run i18n:check` fails and CI is red. The checker only sees literal `t("…")` / `traducir("…")` / `T("…")` calls (no template interpolation) and ignores comments.
- `npm run i18n:pendientes` lists unmarked Spanish strings (heuristic — review list, not a rule).
- User-facing docs come in Spanish/English pairs and are updated together: `README.md`/`README.en.md`, `AYUDA.md`/`HELP.md`. Past commits pair them deliberately.

## Env & release

- Copy `.env.example` to `.env.local` (gitignored). **Everything is optional** — without a Spotify client ID the app runs in Guest Mode. Never add a Spotify client secret: it would ship inside the binary.
- `NEXT_PUBLIC_BASE_PATH` builds the web demo under a subfolder; `NEXT_PUBLIC_DEMO=1` enables demo mode (`src/lib/demo.ts` seeds fake data so screens aren't empty).
- The version lives in **five** files that must match: `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`. Bumping it also requires a `version: "X.Y.Z"` entry in `src/lib/novedades.ts` (the notes users see on update) or `npm run release:verificar` fails. Full release procedure: `ACTUALIZACIONES.md`.
- The private signing key `src-tauri/nexushub-updater.key` is gitignored and must never be committed (only the `.pub` may be).
