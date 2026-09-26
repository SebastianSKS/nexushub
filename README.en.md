# Nexo

[![CI](https://github.com/SebastianSKS/nexushub/actions/workflows/ci.yml/badge.svg)](https://github.com/SebastianSKS/nexushub/actions/workflows/ci.yml)
[![Latest version](https://img.shields.io/github/v/release/SebastianSKS/nexushub?label=version)](https://github.com/SebastianSKS/nexushub/releases/latest)
![Windows](https://img.shields.io/badge/Windows-11-0078D4)
![Languages](https://img.shields.io/badge/languages-Espa%C3%B1ol%20%7C%20English-2ea44f)

**Everything a student needs, in one window**: YouTube videos, Spotify music, PDF and Office tools, a calendar, a class schedule and a calculator, in the Windows 11 (Fluent) look. Everything is stored on your computer; your files never leave it.

🇪🇸 [Leer en español](README.md)

![Nexo home](docs/capturas/ingles-inicio.png)

## What's in it

| | |
|---|---|
| **Video** | The newest videos from the YouTube channels you follow, in a single wall. No YouTube account needed. |
| **Music** | Your Spotify music (Premium is required to play inside Nexo): favorites, recents, playlists and a big player. Controllable from the system tray. |
| **Documents** | 17 tools that work offline: Word/Excel/PowerPoint to PDF, PDF to Word, merge, split, compress, rotate, organize, watermark, page numbers, protect and unlock, compare two PDFs, images to PDF and back, and OCR. If you have Microsoft Office, it uses it so the result comes out identical. |
| **My assignments** | One folder per subject (created from your schedule), with “New file” to make a blank Word, Excel, PowerPoint or text file right there. |
| **Global search** (`Ctrl + K`) | Finds sections, tools, events, classes, channels… and **text inside your PDFs**, opening them on the exact page. |
| **Calendar** | Tasks, exams, appointments and birthdays, with reminders. Exports to `.ics`. |
| **Schedule** | Your weekly classes. Scan the picture you were sent and it fills itself in. Warns you before each class. |
| **Calculator** | Standard and scientific, with history and keyboard support. |
| **Guides and what's new** | Each section explains itself the first time (and with “How does it work?” whenever you want). After an update, a dialog tells you what changed. |
| **Spanish and English** | Fully translated; change it in *Settings › Appearance › Language* (or follow Windows). |
| **Updates** | Nexo checks on its own when it opens and offers an “Update now” button. Your data is kept. |

> Screenshots use made-up sample data (the Spanish ones are in the [Spanish README](README.md)).

## Install

1. Download `Nexo_…_x64-setup.exe` from the [latest release](https://github.com/SebastianSKS/nexushub/releases/latest).
2. Run it. After that Nexo updates itself.

Designed for Windows 11.

## Development

You need [Node.js](https://nodejs.org) 24 and, for the desktop app, [Rust](https://rustup.rs) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/).

```bash
npm install
npm run dev          # the web app at http://localhost:3000
npm run tauri:dev    # the desktop app
```

| Command | What it does |
|---|---|
| `npm run check` | What runs on every push: types + languages + tests |
| `npm run typecheck` | TypeScript only |
| `npm test` | Unit tests (`tests/`, using Node's built-in test runner) |
| `npm run i18n:check` | Every text has its English translation and the variables match |
| `npm run i18n:pendientes` | Finds Spanish texts that don't go through translation yet |
| `npm run build` | Static export (`out/`) |
| `npm run tauri:build` | Windows installer |

### How it's built

- **Next.js 16** (static export) + **React 19** + **TypeScript**, with Tailwind, Zustand and Framer Motion.
- **Tauri 2** for the desktop window and everything that touches the system (folders, Office, app icons, tray, updates), in `src-tauri/`.
- `src/modules/*` are the sections; `src/services/*`, logic without UI; `src/lib/*`, pure functions; `src/store/*`, state.
- PDFs are read with pdf.js and created with pdf-lib; OCR is Tesseract — all on your computer.

### Languages

The **Spanish text is the key**: you write `t("Guardar")` (or `T("…")` for texts that live in data) and the English lives in `src/lib/i18n/en/*.json`, one file per section. To add a new text:

1. Write it in Spanish inside `t(...)`.
2. Run `npm run i18n:check`: it tells you which translations are missing. Add them to the section's JSON.

The check also runs on GitHub, so an untranslated text can't be pushed.

### Automatic checks

Every push and pull request goes through [`.github/workflows/ci.yml`](.github/workflows/ci.yml): types, languages, tests, the web build and `cargo check` of the desktop side. If something breaks, GitHub marks it with a ✗.

### Publishing a version

The steps are in [ACTUALIZACIONES.md](ACTUALIZACIONES.md) (Spanish): bump the version, build with signing, generate `latest.json` and publish the Release. The private signing key is **never** committed.

## Privacy

Nexo has no accounts or server of its own. Your profile, calendar, schedule and settings live on your computer; Documents files are processed right there. The only things that go online are the YouTube and Spotify requests you make, and the update check on GitHub.
