# 🎮 RetroVault

![Version](https://img.shields.io/badge/Version-1.0.0-blue)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Vite%20%2B%20Turborepo-orange)
![License](https://img.shields.io/badge/License-MIT-purple)
![Status](https://img.shields.io/badge/Status-Actively%20Developed-brightgreen)

> **A stunning, local-first retro game emulation platform inside your browser — styled as a hyper-realistic, skeuomorphic Game Boy console.**

RetroVault lets you scan a folder of your own ROM backups, browse them in a beautiful game library, and play them instantly — all inside the browser, with zero internet required after the initial load. Your data never leaves your machine.

---

## ✨ What RetroVault Actually Does

- **File System Vault** — Point the app at any local folder. It scans all ROM files (`.gba`, `.smc`, `.nes`, `.sfc`, `.zip`) and builds a live game library.
- **Automatic Metadata Extraction** — Filenames are intelligently parsed to extract clean game titles and detect the target platform (GBA, SNES, NES).
- **Auto Box Art** — Game cover art is automatically fetched from the official `libretro-thumbnails` GitHub repository using the detected platform and title.
- **Full In-Browser Emulation** — ROMs are launched directly using [Nostalgist.js](https://nostalgist.js.org/), which wraps the Libretro WebAssembly cores (`mGBA`, `Gambatte`, `Snes9x`, `fceumm`) with a clean API.
- **Save States** — Create manual save snapshots at any point. The emulator also auto-saves every 30 seconds in the background to prevent progress loss.
- **Persistent Play History** — Cumulative play time per game is tracked and displayed on each cartridge card.
- **Key Binding Configuration** — Every controller input (`Up`, `Down`, `A`, `B`, `Start`, `Select`) can be remapped to any keyboard key via an in-app modal dialog.
- **Hardware Config Panel** — Adjust audio volume, enable/disable CRT phosphor filter, enable/disable scanline overlay, and switch LCD color themes (Arcade Neon, GameBoy DMG, Virtual Boy).
- **Skeuomorphic Game Boy Shell UI** — The emulator screen is embedded inside a meticulously crafted, pixel-perfect recreation of the original Nintendo Game Boy DMG-01 hardware.

---

## 🖼️ The Interface

The UI is split into three vertical columns:

| Column | Contents |
|---|---|
| **Left** | Game Library grid (cartridge cards), System Logs, Save States panel |
| **Center** | The Game Boy shell — screen bezel, D-Pad, A/B buttons, Select/Start, speaker grill |
| **Right** | Real-time Telemetry (FPS graph, RAM/VRAM usage), Hardware Config panel |

The Game Boy shell is styled with CSS to match the original DMG-01 hardware in exact detail:
- Warm grey plastic shell (`#f2f2f0` to `#cdc9b8` gradient) with a deep rounded bottom-right corner
- Dark grey (`#61626a`) screen bezel with a deep inset shadow
- Matte black D-Pad cross with grip lines on each arm
- Boysenberry (`#8c1f54`) A and B buttons arranged at a `-25deg` rotation in a recessed pill slot
- Dark rubber Select and Start capsule buttons at a `-22deg` angle
- 5-slit speaker grill on the bottom right, angled at `-25deg`
- "Nintendo **GAME BOY**™" logotype beneath the screen

---

## 🗃️ Project Structure

This is a **pnpm + Turborepo monorepo**. Code is divided into isolated packages with clear responsibilities.

```
retrovault/
├── apps/
│   └── web/                     # The main React + Vite PWA application
│       └── src/
│           ├── App.tsx           # Root orchestrator (state, game launch, UI layout)
│           ├── index.css         # Global styles (themes, scanlines, texture, CRT)
│           └── components/
│               └── GameBoy/
│                   └── EmulatorConsole.tsx  # Nostalgist.js wrapper component
│
├── packages/
│   ├── core/                    # Platform utilities and ROM scanning logic
│   │   └── src/
│   │       └── files.ts          # scanDirectory(), extractMetadataFromName(), getBoxArtUrl()
│   │
│   ├── db/                      # All browser storage abstractions (via localforage)
│   │   └── src/
│   │       └── index.ts          # SaveStateStorage, SettingsStorage, PlayHistoryStorage, FavoritesStorage
│   │
│   └── ui/                      # Shared React component library (Button, Card, etc.)
│
├── docs/                        # Full project documentation suite
├── Games/                       # (User-local) Place your ROMs here for quick access
├── turbo.json                   # Turborepo task pipeline config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ (v20 LTS recommended)
- **pnpm** — `npm install -g pnpm`

### 1. Clone the repository

```bash
git clone https://github.com/your-org/retrovault.git
cd retrovault
```

### 2. Install all workspace dependencies

```bash
pnpm install
```

### 3. Start the development server

```bash
pnpm run dev
```

The app will be available at **http://localhost:5173**

> ⚠️ **Must access via `localhost`** — the File System Access API and other browser security APIs require a Secure Context. Accessing via a LAN IP (e.g., `http://192.168.1.5`) will cause failures.

---

## 🎯 How to Play

1. **Add your ROMs** — Click the red `+ ADD ROM` button in the Library panel. Your browser will show a native folder picker. Select the folder containing your `.gba`, `.smc`, or `.nes` files.
2. **Browse your Library** — Games will appear as cartridge cards with box art and play-time badges.
3. **Click a game to boot it** — The emulator initializes, loads the ROM, and restores any previous auto-save state.
4. **Use on-screen controls or keyboard**:
   - Default keyboard: Arrow keys = D-Pad, `X` = A, `Z` = B, `Enter` = Start, `Shift` = Select
   - Remap keys anytime via **Hardware Config → Configure Mappings**
5. **Save your progress** — Hit `+ SAVE` in the Save States panel. The emulator also auto-saves every 30 seconds.

---

## 📦 Platform & Core Support

| Platform | File Extensions | Nostalgist Core |
|---|---|---|
| Game Boy Advance | `.gba` | `mgba` |
| Game Boy / Game Boy Color | `.gb`, `.gbc` | `gambatte` |
| Super Nintendo | `.smc`, `.sfc` | `snes9x` |
| Nintendo Entertainment System | `.nes` | `fceumm` |
| Sega Genesis / Mega Drive | `.md` | `genesis_plus_gx` |

---

## 📂 Documentation

| Document | Description |
|---|---|
| [Architecture.md](./docs/Architecture.md) | Detailed system architecture, layer breakdown, and component diagrams |
| [Database_Architecture.md](./docs/Database_Architecture.md) | How `localforage`-backed storage works for save states, settings, and play history |
| [Development_Guide.md](./docs/Development_Guide.md) | Full setup, mental model, and build instructions for contributors |
| [PRD.md](./docs/PRD.md) | Product requirements and feature roadmap |
| [SRS.md](./docs/SRS.md) | Software requirements specification |
| [Wireframes.md](./docs/Wireframes.md) | Visual layout and component hierarchy |

---

## ⚖️ Legal Disclaimer

RetroVault is strictly an emulation **frontend** and **runtime wrapper**. It ships with no copyrighted BIOS files, ROM dumps, or proprietary game data. It is designed solely as a tool for running backups of games you legally own. No game content is hosted, transmitted, or served by this application or its distribution infrastructure.

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite |
| Monorepo | Turborepo + pnpm Workspaces |
| Emulation | [Nostalgist.js](https://nostalgist.js.org/) (Libretro WASM) |
| Storage | [localforage](https://localforage.github.io/localForage/) (IndexedDB backend) |
| Styling | Tailwind CSS + Vanilla CSS |
| File Access | Browser File System Access API |
| Icons | Lucide React |
