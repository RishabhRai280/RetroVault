# Database & Storage Architecture
## RetroVault — v1.1.0

> This document describes the **actual storage implementation** as built, using `localforage` (IndexedDB-backed) for all persistence.

---

## 1. Storage Technology Choice

### Why `localforage` (not raw OPFS)?

The original architecture spec proposed using the **Origin Private File System (OPFS)** for ROM binary storage. In the delivered implementation, ROMs are **never copied into browser storage**. Instead, the app uses the browser's **File System Access API** to hold a persistent `FileSystemDirectoryHandle` reference pointing at the user's local ROM folder. ROM files are read on demand directly from their native location.

This decision has several advantages:
- **Zero ROM storage overhead** — a 32MB GBA game takes up 0 bytes of browser quota
- **No ingestion step** — click a folder, library appears instantly
- **Native-speed file reads** — the browser reads straight from the OS filesystem

`localforage` is then used exclusively for the **lightweight, structured data** that needs to persist:
- Save states (binary blobs)
- User settings
- Play history (playtime, timestamps)
- Favorited game IDs (reserved for future use)

`localforage` uses **IndexedDB** as its backend when available (which it is in all modern browsers), falling back to WebSQL or localStorage automatically. All operations are asynchronous and Promise-based.

---

## 2. Store Instances

Four completely isolated `localforage` instances are created in `packages/db/src/index.ts`. Each maps to a separate IndexedDB object store within the `RetroVault` database:

| Instance Variable | Store Name | Database Name | Purpose |
|---|---|---|---|
| `favoritesStore` | `favorites` | `RetroVault` | Favorited game ID list |
| `saveStateStore` | `save_states` | `RetroVault` | Save state blobs + metadata |
| `settingsStore` | `settings` | `RetroVault` | User preferences |
| `playHistoryStore` | `play_history` | `RetroVault` | Per-game playtime records |

---

## 3. Data Models

### `SaveStateMetadata`
```ts
interface SaveStateMetadata {
    id: string;       // Composite key: "${gameId}_${timestamp}"
    gameId: string;   // e.g., "PokemonFireRed.gba-16777216"
    gameTitle: string;
    timestamp: number; // Unix ms timestamp of when saved
}
```

### `PlayHistory`
```ts
interface PlayHistory {
    gameId: string;
    lastPlayed: number;       // Unix ms timestamp
    timePlayedSeconds: number; // Cumulative seconds across all sessions
}
```

### `UserSettings`
```ts
interface UserSettings {
    volume: number;              // 0.0 to 1.0
    crtFilterEnabled: boolean;
    scanlinesEnabled: boolean;
    colorTheme: 'arcade-neon' | 'gameboy-dmg' | 'virtual-boy';
    keyBindings: KeyBindings;
}

interface KeyBindings {
    up: string;     // Default: 'up'
    down: string;   // Default: 'down'
    left: string;   // Default: 'left'
    right: string;  // Default: 'right'
    a: string;      // Default: 'x'
    b: string;      // Default: 'z'
    start: string;  // Default: 'enter'
    select: string; // Default: 'shift'
}
```

---

## 4. Storage API Reference

### `SaveStateStorage`

| Method | Description |
|---|---|
| `saveState(gameId, gameTitle, blob)` | Writes a Blob under key `blob_${saveId}`, appends metadata to `meta_${gameId}` list |
| `loadState(saveId)` | Returns `Blob` for `blob_${saveId}` |
| `getStatesForGame(gameId)` | Returns full `SaveStateMetadata[]` for `meta_${gameId}` |
| `saveAutoState(gameId, blob)` | Overwrites `auto_save_blob_${gameId}` — always one slot |
| `loadAutoState(gameId)` | Returns auto-save blob if exists, else null |

**Key naming conventions in `saveStateStore`:**
```
blob_${gameId}_${timestamp}   → The actual binary data (Blob)
meta_${gameId}                → SaveStateMetadata[] index for this game
auto_save_blob_${gameId}      → Always-overwritten auto-save slot
```

### `SettingsStorage`

| Method | Description |
|---|---|
| `getSettings()` | Returns stored `UserSettings` or the hardcoded `DEFAULT_SETTINGS` |
| `updateSettings(partial)` | Merges with current, writes back full object |

Key: `user_settings`

### `PlayHistoryStorage`

| Method | Description |
|---|---|
| `getPlayHistory(gameId)` | Returns `PlayHistory` for one game |
| `updatePlayHistory(gameId, increment)` | Creates entry if missing, adds `increment` seconds, updates timestamp |
| `getAllPlayHistory()` | Iterates all keys, builds `Record<string, PlayHistory>` map |

Key per game: the `gameId` string itself (e.g., `PokemonFireRed.gba-16777216`).

### `FavoritesStorage`

| Method | Description |
|---|---|
| `getFavorites()` | Returns string array of favorited IDs |
| `toggleFavorite(gameId)` | Adds or removes from array, returns new boolean state |
| `isFavorite(gameId)` | Returns boolean |

Key: `list` (a single array of all favorited IDs).

---

## 5. Auto-Save Lifecycle

The auto-save mechanism runs on a 30-second interval inside the `EmulatorConsole` component:

```
[Emulator Running]
       │
       ▼
    setInterval (30s)
       │
       ├── nostalgist.saveState()           → returns { state: Blob }
       └── SaveStateStorage.saveAutoState() → writes to localforage

[Game Reopened]
       │
       ▼
    Nostalgist.launch() completes
       │
       ├── SaveStateStorage.loadAutoState(gameId)
       └── nostalgist.loadState(blob)       → restores where user left off
```

Play time tracking runs on a separate 10-second interval:

```
setInterval (10s)
    └── PlayHistoryStorage.updatePlayHistory(gameId, 10)
```

---

## 6. GameMetadata ID Strategy

Games do **not** use SHA-1 hashing (as originally planned). The unique ID is generated at scan time as:

```ts
id = `${fileName}-${file.size}`
// Example: "PokemonFireRed.gba-16777216"
```

This provides a stable, deterministic ID without requiring any async hashing. It is used as the key for all `playHistoryStore` and `saveStateStore` records, ensuring save states correctly map to their game even across sessions.

---

## 7. Storage Quota Considerations

localforage (IndexedDB) is subject to browser storage quotas:
- Most modern browsers give origins **up to 10% of total disk** (often gigabytes)
- Save state blobs are typically small (< 5MB per state)
- The biggest storage concern is accumulation of manual save states over long periods of play

Future improvement: display a storage usage estimate using `navigator.storage.estimate()` and warn if it approaches limits.
