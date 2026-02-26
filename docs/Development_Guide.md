# Local Development Guide
## RetroVault — v1.0.0

> Complete setup, mental model, and contribution guide for developers working on RetroVault.

---

## 1. Prerequisites

| Tool | Minimum Version | Notes |
|---|---|---|
| **Node.js** | v18.x | v20 LTS strongly recommended |
| **pnpm** | v9.x | Install via `npm install -g pnpm` |
| **Git** | Any | For version control |

---

## 2. First-Time Setup

### Step 1 — Clone the Repository

```bash
git clone https://github.com/your-org/retrovault.git
cd retrovault
```

### Step 2 — Install All Dependencies

```bash
pnpm install
```

This installs dependencies for all three packages (`core`, `db`, `ui`) and the `apps/web` app simultaneously using pnpm workspaces.

### Step 3 — Start the Development Server

```bash
pnpm run dev
```

Turborepo runs all packages in watch mode, then starts Vite's dev server for `apps/web`. App is available at:

```
http://localhost:5173
```

> ⚠️ **Critical**: The File System Access API **requires a Secure Context**. Always access via `http://localhost` — not a LAN IP like `http://192.168.1.5`. Doing so will cause the directory picker to silently fail.

---

## 3. Understanding the Codebase

### The Boot Flow

When you open the app in your browser, this is what happens:

```
1. Vite serves apps/web/src/main.tsx
2. React renders <App /> from App.tsx
3. App loads user settings from localforage (SettingsStorage.getSettings())
4. App loads all play history from localforage (PlayHistoryStorage.getAllPlayHistory())
5. App renders the three-column layout:
   ├── Left sidebar: Empty library grid (no games yet)
   ├── Center: Game Boy shell with idle emulator screen ("NO CARTRIDGE DETECTED")
   └── Right sidebar: Telemetry (showing "--") and Hardware Config panel
```

### Adding ROMs — The Vault Flow

```
User clicks "+ ADD ROM"
    ↓
window.showDirectoryPicker() → browser native folder picker dialog
    ↓
User selects their /Games folder
App receives FileSystemDirectoryHandle
    ↓
scanDirectory(handle) from @retrovault/core
    ↓
Iterates all files, filters for .gba/.smc/.sfc/.nes/.zip
For each ROM:
    - extractMetadataFromName(fileName) → clean title, platform
    - getBoxArtUrl(title, platform) → libretro-thumbnails CDN URL
    - Push to GameMetadata[]
    ↓
setGames(foundGames) → React re-renders the library grid
Each card shows: title, platform badge, play time, box art (lazy loaded)
```

### Playing a Game — The Emulator Flow

```
User clicks a cartridge card
    ↓
dirHandle.getFileHandle(game.fileName).getFile() → File object
setActiveGame({ metadata: game, file })
setEmulatorInstance(null)  // ensure clean state
    ↓
React re-renders, EmulatorConsole receives romFile prop (non-null)
    ↓
useEffect triggers (key dep: romFile)
    ↓
Nostalgist.launch({
    rom: file,
    core: CORE_MAP[platform],      // e.g., 'mgba' for GBA
    element: canvasRef.current,    // the <canvas> inside the screen bezel
    retroarchConfig: { audio_volume, key_bindings... },
    size: { width, height }        // current container pixel dimensions
})
    ↓
WASM core fetches from Nostalgist CDN, compiles, starts emulation
    ↓
onReady(nostalgistInstance) → App.tsx stores it in emulatorInstance state
    ↓
Background intervals start:
    - Every 10s: PlayHistoryStorage.updatePlayHistory()
    - Every 30s: nostalgist.saveState() → SaveStateStorage.saveAutoState()
    ↓
requestAnimationFrame telemetry loop starts measuring FPS
```

---

## 4. Key Files Reference

| File | Purpose |
|---|---|
| `apps/web/src/App.tsx` | Root component — all state, layout, game launch logic (~770 lines) |
| `apps/web/src/index.css` | All visual effects — themes, scanlines, CRT filter, textures, slider styles |
| `apps/web/src/components/GameBoy/EmulatorConsole.tsx` | Nostalgist.js lifecycle wrapper — boot, save, resize, auto-save |
| `packages/core/src/files.ts` | `scanDirectory()`, `extractMetadataFromName()`, `getBoxArtUrl()` |
| `packages/db/src/index.ts` | All localforage storage: SaveState, Settings, PlayHistory, Favorites |
| `packages/ui/src/` | Re-exported `Button` and `Card` React components |
| `turbo.json` | Turborepo pipeline definitions (dev, build, lint, typecheck) |

---

## 5. Turborepo Pipeline

```
pnpm run dev      → turbo run dev       → Runs Vite dev servers for all apps/packages
pnpm run build    → turbo run build     → Builds all packages then apps/web
pnpm run lint     → turbo run lint      → ESLint across all workspaces
pnpm run typecheck → turbo run typecheck → tsc --noEmit across all workspaces
pnpm run format   → prettier --write   → Formats all .ts/.tsx/.md files
```

Turborepo caches task outputs — re-running `pnpm run build` after no changes will use cached output near-instantly.

---

## 6. Making Changes

### Changing the Game Boy Shell Appearance

All visual layout for the Game Boy hardware shell is inside `App.tsx`, inside the `<div className="w-[490px] h-[860px] ...">` block (around line 469).

Key structural elements:
- **Screen Bezel** — `h-[420px]` dark grey div with `rounded-b-[4rem]`
- **Nintendo GAME BOY Logo** — plain HTML text spans with specific colors and font weights
- **D-Pad** — absolutely positioned cross divs inside a `w-[150px] h-[140px]` relative container
- **A/B Buttons** — absolutely positioned inside a rotated pill background at `-rotate-[25deg]`
- **Select/Start** — rotated pill containers at `-rotate-[22deg]`
- **Speaker Grill** — 5 individual `div` elements rotated at `-rotate-[25deg]` in a flex row

### Adding Storage for a New Feature

1. Add a new `localforage.createInstance()` in `packages/db/src/index.ts`
2. Export a typed service object with async get/set methods
3. Import and call from `App.tsx` or `EmulatorConsole.tsx`
4. Add types to the interface exports if they need to be shared

### Adding a New Emulation Core

1. Add a new entry to `CORE_MAP` in `EmulatorConsole.tsx`:
   ```ts
   N64: 'mupen64plus_next',
   ```
2. Add the file extension to `scanDirectory` in `packages/core/src/files.ts`:
   ```ts
   const isRomFile = entry.name.match(/\.(gba|smc|sfc|nes|zip|n64|z64)$/i);
   ```
3. Add the platform type to `GameMetadata.platform` in `packages/core/src/files.ts`
4. Add platform detection in `extractMetadataFromName`
5. Add box art URL mapping in `getBoxArtUrl`

---

## 7. Building for Production

```bash
pnpm run build
pnpm run preview
```

This compiles all TypeScript, bundles with Vite, and serves the output on a local static server — exactly as users will experience it.

---

## 8. Common Issues

### "Failed to load game file" in system logs
The `FileSystemDirectoryHandle` can expire between sessions (browser security policy). If this happens, click `CHG VAULT` to re-open the directory picker and select the same folder again.

### Emulator boots but immediately restarts
This was a bug caused by React's `useEffect` including `onLog` and `volume` in its dependency array, causing infinite teardown cycles. This is fixed — the stable `useRef` pattern in `EmulatorConsole.tsx` ensures the emulator only boots once per ROM.

### Box art doesn't load
Box art is fetched from `raw.githubusercontent.com/libretro-thumbnails/...`. If the title doesn't exactly match the repository's naming convention, the image will 404 and silently hide. The `<img onError>` handler removes the image element gracefully.

### Emulator shows loading spinner indefinitely
The Nostalgist CDN hosts WASM cores (~2–10MB per core). On first launch per core, it downloads and caches. Slow connections may take 10–30 seconds. Subsequent launches of the same platform use the cached WASM.
