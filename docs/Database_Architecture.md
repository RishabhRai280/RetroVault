# Database & Storage Architecture
## RetroVault

---

## 1. The Dual-Layer Approach
To achieve both high-performance emulation (60 FPS without I/O stutter) and rich metadata querying in the browser, RetroVault implements a **dual-layer storage strategy**.

### Layer 1: Origin Private File System (OPFS)
*   **Role**: High-speed, heavy binary blob storage.
*   **Contents**: The actual `.gba`/`.gbc` ROM binaries, `.sav` battery dumps, and Save State dumps space.
*   **Why OPFS?** OPFS is highly optimized for fast read/write access directly from Web Workers. Standard IndexedDB is often significantly too slow for parsing 32MB+ ROMs synchronously during CPU emulation. OPFS functions like a real, isolated native hard drive inside the browser Sandbox.

### Layer 2: IndexedDB (via Dexie.js)
*   **Role**: Relational metadata and fast search index.
*   **Contents**: Game titles, accumulated playtimes, SHA-1 hashes (Primary Keys), user configurations, and base64/blob Box Art images.
*   **Why IndexedDB?** It allows complex SQL-like filtering, sorting by "Recently Played", and responsive text lookup of the library without needing to touch or load the monstrous binary files stored in OPFS.

---

## 2. The Data Lifecycle

### A. Ingestion (Adding a Game)
1.  **Action**: User drops `PokemonEmerald.gba` into the app window.
2.  **Hashing**: The UI thread passes the file to a Web Worker which generates a quick `SHA-1` hash (e.g., `a1b2c3...`). This hash acts as the absolute unique identifier.
3.  **Binary Write**: The file is streamed and written to OPFS at path: `/roms/a1b2c3.gba`.
4.  **Index Write**: Dexie.js creates a metadata record in the `games` table: 
    `{ hash: 'a1b2c3...', title: 'Pokemon Emerald', system: 'GBA', fileRef: '/roms/a1b2c3.gba' }`.
5.  **Completion**: The UI instantly updates the Vault view to show the new game.

### B. Emulation (Playing a Game)
1.  **Action**: User clicks the newly added game inside the Vault.
2.  **Pointer Pass**: The UI queries IndexedDB for the game's hash, finds the `fileRef`, and passes that string path to the **Emulation Web Worker**.
3.  **Memory Load**: The Emulation Worker utilizes OPFS SyncAccessHandles to read the binary `/roms/a1b2c3.gba` directly into the Libretro WASM memory heap at lightning speed.
4.  **Save Injection**: The Worker checks OPFS for `/saves/a1b2c3.sav`. If the file is found natively, it is written into the active WASM SRAM allocation space, effectively loading the user's previous save battery.

### C. Persistence (Saving a Game)
1.  **Trigger**: Every 60 seconds of active playtime, OR immediately whenever the user forcefully accesses the "Pause Overlay".
2.  **Extraction**: The Emulation Worker pauses the CPU loop and extracts the current SRAM memory buffer block directly from WASM.
3.  **File Dump**: The Worker writes the buffer, directly overwriting the file at OPFS `/saves/a1b2c3.sav`.
4.  **Stats Update**: Separately, the UI thread calculates elapsed session time and updates the IndexedDB `stats` table (incrementing `playTimeSeconds` and setting the current UNIX timestamp on `lastPlayed`).

---

## 3. Storage Quotas & Limits
Browsers limit how much space domains can consume. 
*   **StorageManager API**: RetroVault proactively polls `navigator.storage.estimate()` on boot.
*   **Alerting**: If usage exceeds 80% of the browser's allocated quota, a non-intrusive banner appears in the Vault view suggesting the user export/backup their `.sav` files to their desktop and delete unused heavy ROMs.
