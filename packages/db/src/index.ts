/**
 * @file index.ts
 * @package @retrovault/db
 * @description
 * All browser-side persistent storage for RetroVault, built on top of `localforage`.
 *
 * TECHNOLOGY CHOICE: localforage is used instead of raw IndexedDB because:
 *  - It provides a clean, async Promise-based API vs. IndexedDB's verbose callback model
 *  - It automatically selects the best available storage backend (IndexedDB → WebSQL → localStorage)
 *  - It handles serializing/deserializing Blob objects transparently
 *
 * ARCHITECTURE:
 *  Four isolated `localforage` instances are created, each mapping to a separate
 *  IndexedDB object store within the single "RetroVault" database. The stores are:
 *
 *  ┌─────────────────┬──────────────────────┬────────────────────────────────────┐
 *  │ Store Name      │ localforage Instance  │ Purpose                            │
 *  ├─────────────────┼──────────────────────┼────────────────────────────────────┤
 *  │ favorites       │ favoritesStore        │ Array of favorited game ID strings  │
 *  │ save_states     │ saveStateStore        │ Binary save blobs + metadata index  │
 *  │ settings        │ settingsStore         │ UserSettings preference object      │
 *  │ play_history    │ playHistoryStore      │ Per-game playtime records           │
 *  └─────────────────┴──────────────────────┴────────────────────────────────────┘
 *
 * NOTE: ROM files are NOT stored here. They are read on-demand from the user's
 * local directory via the File System Access API (FileSystemDirectoryHandle).
 * This means no ROM data ever consumes browser storage quota.
 */

import localforage from 'localforage';

// ─────────────────────────────────────────────────────────────────────────────
// Store Instances
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Isolated localforage store for favorited game IDs.
 * Stores a single key `list` → `string[]`.
 * Reserved for a future "Favorites" filter view in the library grid.
 */
export const favoritesStore = localforage.createInstance({
    name: "RetroVault",
    storeName: "favorites",
    description: "User favorited game IDs"
});

/**
 * Isolated localforage store for all save state data.
 *
 * Key naming convention used within this store:
 *  - `blob_${saveId}`      → The raw Blob snapshot from nostalgist.saveState()
 *  - `meta_${gameId}`      → SaveStateMetadata[] index for all saves of a game
 *  - `auto_save_blob_${gameId}` → Single always-overwritten auto-save slot per game
 */
export const saveStateStore = localforage.createInstance({
    name: "RetroVault",
    storeName: "save_states",
    description: "Binary blobs of emulator memory states"
});

/**
 * Isolated localforage store for user preferences.
 * Stores a single key `user_settings` → `UserSettings`.
 */
export const settingsStore = localforage.createInstance({
    name: "RetroVault",
    storeName: "settings",
    description: "User preferences"
});

/**
 * Isolated localforage store for per-game play history.
 * Key per game = the `gameId` string itself → `PlayHistory` object.
 */
export const playHistoryStore = localforage.createInstance({
    name: "RetroVault",
    storeName: "play_history",
    description: "User playtime and last played timestamps"
});

// ─────────────────────────────────────────────────────────────────────────────
// Favorites Storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Service object for managing the list of user-favorited game IDs.
 * All state is stored as a single `string[]` under the key `list` in `favoritesStore`.
 *
 * Currently reserved — the UI favorite button is styled but the filter view
 * is planned for a future release.
 */
export const FavoritesStorage = {
    /**
     * Retrieves the full list of favorited game IDs from localforage.
     * Returns an empty array if no favorites have been saved yet.
     *
     * @returns Promise<string[]> — Array of favorited gameId strings.
     */
    getFavorites: async (): Promise<string[]> => {
        const favs = await favoritesStore.getItem<string[]>('list');
        return favs || [];
    },

    /**
     * Toggles the favorite status of a specific game.
     * If the gameId is already in the list, it is removed.
     * If not, it is added to the end of the list.
     * The updated list is written back to localforage synchronously.
     *
     * @param gameId - The unique game identifier (e.g., "PokemonFireRed.gba-16777216")
     * @returns Promise<boolean> — `true` if the game is now favorited, `false` if unfavorited.
     */
    toggleFavorite: async (gameId: string): Promise<boolean> => {
        let favs = await FavoritesStorage.getFavorites();
        const isFavorited = favs.includes(gameId);

        if (isFavorited) {
            favs = favs.filter(id => id !== gameId); // Remove from list
        } else {
            favs.push(gameId); // Add to list
        }

        await favoritesStore.setItem('list', favs);
        return !isFavorited; // Return the NEW state
    },

    /**
     * Checks if a specific game is currently favorited.
     *
     * @param gameId - The unique game identifier
     * @returns Promise<boolean> — `true` if favorited, `false` otherwise.
     */
    isFavorite: async (gameId: string): Promise<boolean> => {
        const favs = await FavoritesStorage.getFavorites();
        return favs.includes(gameId);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Save State Storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metadata record for a single user-created save state.
 * The actual binary blob is stored separately under `blob_${id}`.
 */
export interface SaveStateMetadata {
    /** Composite unique key: `${gameId}_${Date.now()}`. Used to look up the corresponding blob. */
    id: string;
    /** The game this save belongs to (matches `GameMetadata.id`). */
    gameId: string;
    /** Human-readable game title, stored here so it can be displayed in the Save States panel without a library lookup. */
    gameTitle: string;
    /** Unix millisecond timestamp of when this save was created. Displayed as a formatted date/time in the UI. */
    timestamp: number;
}

/**
 * Service object for all save state operations.
 *
 * STORAGE PATTERN (in saveStateStore):
 *  - Each save state has two entries:
 *    1. `blob_${saveId}` → The raw Blob from `nostalgist.saveState().state`
 *    2. `meta_${gameId}` → SaveStateMetadata[] index listing all saves for that game
 *  - The auto-save slot is a single overwriting key:
 *    `auto_save_blob_${gameId}` → Latest Blob from background auto-save
 */
export const SaveStateStorage = {
    /**
     * Persists a new manual save state for a game.
     * Writes the binary Blob and updates the metadata index in localforage.
     *
     * @param gameId - Unique game identifier (used as storage key prefix)
     * @param gameTitle - Human-readable title (stored in metadata for display)
     * @param blob - The WASM memory snapshot Blob from `nostalgist.saveState().state`
     * @returns Promise<SaveStateMetadata> — The metadata record for the saved state.
     */
    saveState: async (gameId: string, gameTitle: string, blob: Blob): Promise<SaveStateMetadata> => {
        const timestamp = Date.now();
        const saveId = `${gameId}_${timestamp}`; // Unique ID: gameId + current Unix ms timestamp

        // Write the actual binary blob data (may be multiple MB for complex games)
        await saveStateStore.setItem(`blob_${saveId}`, blob);

        // Update the metadata index (a list of all save records for this game)
        const metadataKey = `meta_${gameId}`;
        let metaList = await saveStateStore.getItem<SaveStateMetadata[]>(metadataKey) || [];

        const newMeta: SaveStateMetadata = { id: saveId, gameId, gameTitle, timestamp };
        metaList.push(newMeta);

        await saveStateStore.setItem(metadataKey, metaList);

        return newMeta;
    },

    /**
     * Loads a specific save state's binary blob by its exact save ID.
     * The save ID is obtained from the `SaveStateMetadata.id` field.
     *
     * @param saveId - The composite save ID (e.g., "PokemonFireRed.gba-16777216_1709030400000")
     * @returns Promise<Blob | null> — The raw WASM memory snapshot, or null if not found.
     */
    loadState: async (saveId: string): Promise<Blob | null> => {
        return await saveStateStore.getItem<Blob>(`blob_${saveId}`);
    },

    /**
     * Retrieves all save state metadata records for a single game.
     * Returns an empty array if no saves exist for the game.
     * Used to populate the Save States panel in the UI.
     *
     * @param gameId - Unique game identifier
     * @returns Promise<SaveStateMetadata[]> — Chronological list of saves for this game.
     */
    getStatesForGame: async (gameId: string): Promise<SaveStateMetadata[]> => {
        return await saveStateStore.getItem<SaveStateMetadata[]>(`meta_${gameId}`) || [];
    },

    /**
     * Overwrites the single auto-save slot for a game with the latest WASM memory snapshot.
     * Called every 30 seconds by the background interval in EmulatorConsole.tsx.
     * There is only ever ONE auto-save slot per game (not a rolling history).
     *
     * @param gameId - Unique game identifier
     * @param blob - Latest WASM memory snapshot from `nostalgist.saveState().state`
     */
    saveAutoState: async (gameId: string, blob: Blob): Promise<void> => {
        await saveStateStore.setItem(`auto_save_blob_${gameId}`, blob);
    },

    /**
     * Loads the latest auto-save blob for a game.
     * Called immediately after Nostalgist.launch() succeeds in EmulatorConsole.tsx.
     * If non-null, the blob is passed to `nostalgist.loadState()` to restore exactly
     * where the player left off in their last session.
     *
     * @param gameId - Unique game identifier
     * @returns Promise<Blob | null> — The latest auto-save blob, or null if none exists.
     */
    loadAutoState: async (gameId: string): Promise<Blob | null> => {
        return await saveStateStore.getItem<Blob>(`auto_save_blob_${gameId}`);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Play History Storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record tracking cumulative playtime and last session timestamp for a single game.
 * Stored in localforage with the `gameId` as the key.
 */
export interface PlayHistory {
    /** The game this record belongs to (matches `GameMetadata.id`). */
    gameId: string;
    /** Unix millisecond timestamp of the last time this game was played. */
    lastPlayed: number;
    /** Total cumulative seconds spent playing this game across all sessions. */
    timePlayedSeconds: number;
}

/**
 * Service object for tracking per-game play time.
 *
 * MECHANISM: An interval in EmulatorConsole.tsx calls `updatePlayHistory(gameId, 10)`
 * every 10 seconds while a game is running. This increments the cumulative total
 * without requiring any event-driven save logic.
 *
 * The `timePlayedSeconds` value is converted to a human-readable format (e.g., "2h 14m")
 * and displayed on each cartridge card in the Library panel.
 */
export const PlayHistoryStorage = {
    /**
     * Retrieves the play history record for a single game.
     *
     * @param gameId - Unique game identifier
     * @returns Promise<PlayHistory | null> — The history record, or null if never played.
     */
    getPlayHistory: async (gameId: string): Promise<PlayHistory | null> => {
        return await playHistoryStore.getItem<PlayHistory>(gameId);
    },

    /**
     * Creates or updates the play history record for a game.
     * If no record exists, a new one is created with the given increment as the starting value.
     * Always updates `lastPlayed` to the current timestamp.
     *
     * @param gameId - Unique game identifier
     * @param timePlayedIncrement - Number of seconds to add to the cumulative total (typically 10)
     * @returns Promise<PlayHistory> — The updated play history record.
     */
    updatePlayHistory: async (gameId: string, timePlayedIncrement: number): Promise<PlayHistory> => {
        let history = await playHistoryStore.getItem<PlayHistory>(gameId);

        if (!history) {
            // First play — initialize with current timestamp and zero seconds
            history = { gameId, lastPlayed: Date.now(), timePlayedSeconds: 0 };
        }

        history.lastPlayed = Date.now();                       // Always update to current session time
        history.timePlayedSeconds += timePlayedIncrement;       // Accumulate total seconds

        await playHistoryStore.setItem(gameId, history);
        return history;
    },

    /**
     * Retrieves the full play history map for ALL games.
     * Used on app boot by App.tsx to pre-populate the playtime badge on every
     * library cartridge card, without requiring individual per-game lookups.
     *
     * @returns Promise<Record<string, PlayHistory>> — Map of gameId → PlayHistory.
     */
    getAllPlayHistory: async (): Promise<Record<string, PlayHistory>> => {
        const result: Record<string, PlayHistory> = {};
        await playHistoryStore.iterate((value: PlayHistory, key: string) => {
            result[key] = value;
        });
        return result;
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Settings Storage
// ─────────────────────────────────────────────────────────────────────────────

/**
 * User-configurable keyboard bindings for all 8 emulator input buttons.
 * Values are key name strings as recognized by the RetroArch/libretro input system.
 * Default values match the most common retro emulator keyboard layout conventions.
 */
export interface KeyBindings {
    up: string;     // Default: 'up' (arrow key)
    down: string;   // Default: 'down' (arrow key)
    left: string;   // Default: 'left' (arrow key)
    right: string;  // Default: 'right' (arrow key)
    a: string;      // Default: 'x' (SNES layout: right-side button = A)
    b: string;      // Default: 'z' (SNES layout: left-side button = B)
    start: string;  // Default: 'enter'
    select: string; // Default: 'shift'
}

/**
 * Definition of the physical look of the game boy console.
 */
export interface CasingTheme {
    /** The style chosen by the user */
    type: 'classic' | 'solid' | 'gradient' | 'image';
    
    /** Used when type is 'classic' */
    classicId: 'plastic-gray' | 'atomic-purple' | 'clear' | 'yellow';
    
    /** Used when type is 'solid' */
    solidColor: string;
    
    /** Used when type is 'gradient' */
    gradient: {
        colorFrom: string;
        colorTo: string;
        direction: 'to right' | 'to bottom' | 'to bottom right' | 'to bottom left' | 'to top right' | 'to top left';
    };
    
    /** Used when type is 'image' */
    imageUrl: string;
}

/**
 * Complete set of user-configurable preferences for RetroVault.
 * Stored as a single JSON object under key `user_settings` in `settingsStore`.
 */
export interface UserSettings {
    /** Master volume: linear 0.0 (mute) → 1.0 (full). Converted to dB inside EmulatorConsole. */
    volume: number;
    /** Enable the CRT phosphor vignette overlay on the emulator canvas. */
    crtFilterEnabled: boolean;
    /** Enable the horizontal scanline overlay on the emulator canvas. */
    scanlinesEnabled: boolean;
    /**
     * Active color theme for the UI accent colors.
     * Controls the `--retro-neon` and `--retro-neon-dim` CSS custom properties.
     *  - 'arcade-neon': Bright green (#00ff41) — classic terminal/arcade aesthetic
     *  - 'gameboy-dmg': Warm olive (#8bac0f) — authentic Game Boy DMG LCD color
     *  - 'virtual-boy': Deep red (#ff0000) — Virtual Boy monochrome LED aesthetic
     */
    colorTheme: 'arcade-neon' | 'gameboy-dmg' | 'virtual-boy';
    /** Configurable keyboard bindings for all 8 emulator input actions. */
    keyBindings: KeyBindings;
    /** Describes the physical material, color, and texture of the console body. */
    casingTheme: CasingTheme;
}

/**
 * Factory defaults applied when no user settings have been saved.
 * These defaults are designed to feel immediately familiar to retro emulator enthusiasts:
 * - Arrow keys for D-Pad matches every other emulator
 * - X=A, Z=B matches ZSNES and other SNES-era convention
 * - Enter=Start, Shift=Select are near-universal
 */
const DEFAULT_SETTINGS: UserSettings = {
    volume: 1.0,
    crtFilterEnabled: false,
    scanlinesEnabled: false,
    colorTheme: 'arcade-neon',
    keyBindings: {
        up: 'up',
        down: 'down',
        left: 'left',
        right: 'right',
        a: 'x',
        b: 'z',
        start: 'enter',
        select: 'shift'
    },
    casingTheme: {
        type: 'classic',
        classicId: 'plastic-gray',
        solidColor: '#b5b5b5',
        gradient: {
            colorFrom: '#e66465',
            colorTo: '#9198e5',
            direction: 'to bottom right'
        },
        imageUrl: ''
    }
};

/**
 * Service object for reading and updating user preferences.
 * Uses a merge strategy so partial updates to settings never wipe unrelated fields.
 */
export const SettingsStorage = {
    /**
     * Retrieves the current user settings from localforage.
     * Falls back to `DEFAULT_SETTINGS` if the user has never configured preferences.
     *
     * @returns Promise<UserSettings> — Always returns a fully populated UserSettings object.
     */
    getSettings: async (): Promise<UserSettings> => {
        const settings = await settingsStore.getItem<UserSettings>('user_settings');
        return settings || DEFAULT_SETTINGS;
    },

    /**
     * Merges a partial settings update with the current settings and persists the result.
     * Uses object spread so only the specified fields are changed — all others are preserved.
     *
     * Example:
     *   updateSettings({ volume: 0.5 }) — changes volume only, leaves all other fields intact.
     *
     * @param newSettings - Partial<UserSettings> — Only the fields to update.
     * @returns Promise<UserSettings> — The complete updated settings object after merging.
     */
    updateSettings: async (newSettings: Partial<UserSettings>): Promise<UserSettings> => {
        const current = await SettingsStorage.getSettings();
        const updated = { ...current, ...newSettings }; // Non-destructive merge
        await settingsStore.setItem('user_settings', updated);
        return updated;
    }
};
