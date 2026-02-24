import localforage from 'localforage';

// Configure distinct instances for different domains of data

export const favoritesStore = localforage.createInstance({
    name: "RetroVault",
    storeName: "favorites",
    description: "User favorited game IDs"
});

export const saveStateStore = localforage.createInstance({
    name: "RetroVault",
    storeName: "save_states",
    description: "Binary blobs of emulator memory states"
});

export const settingsStore = localforage.createInstance({
    name: "RetroVault",
    storeName: "settings",
    description: "User preferences"
});

// --- Favorites Storage ---

export const FavoritesStorage = {
    /**
     * Retrieves the full list of favorited game IDs.
     */
    getFavorites: async (): Promise<string[]> => {
        const favs = await favoritesStore.getItem<string[]>('list');
        return favs || [];
    },

    /**
     * Toggles the favorite status of a specific game ID.
     */
    toggleFavorite: async (gameId: string): Promise<boolean> => {
        let favs = await FavoritesStorage.getFavorites();
        const isFavorited = favs.includes(gameId);

        if (isFavorited) {
            favs = favs.filter(id => id !== gameId);
        } else {
            favs.push(gameId);
        }

        await favoritesStore.setItem('list', favs);
        return !isFavorited;
    },

    /**
     * Checks if a specific game is favorited.
     */
    isFavorite: async (gameId: string): Promise<boolean> => {
        const favs = await FavoritesStorage.getFavorites();
        return favs.includes(gameId);
    }
};

// --- Save State Storage ---

export interface SaveStateMetadata {
    id: string; // Unique ID for the save (e.g., timestamp)
    gameId: string;
    gameTitle: string;
    timestamp: number;
}

export const SaveStateStorage = {
    /**
     * Saves a binary blob state for a specific game.
     */
    saveState: async (gameId: string, gameTitle: string, blob: Blob): Promise<SaveStateMetadata> => {
        const timestamp = Date.now();
        const saveId = `${gameId}_${timestamp}`;

        // Save the actual blob data
        await saveStateStore.setItem(`blob_${saveId}`, blob);

        // Update the metadata index for this game
        const metadataKey = `meta_${gameId}`;
        let metaList = await saveStateStore.getItem<SaveStateMetadata[]>(metadataKey) || [];

        const newMeta: SaveStateMetadata = { id: saveId, gameId, gameTitle, timestamp };
        metaList.push(newMeta);

        await saveStateStore.setItem(metadataKey, metaList);

        return newMeta;
    },

    /**
     * Loads a specific save state blob.
     */
    loadState: async (saveId: string): Promise<Blob | null> => {
        return await saveStateStore.getItem<Blob>(`blob_${saveId}`);
    },

    /**
     * Retrieves all save metadata for a specific game.
     */
    getStatesForGame: async (gameId: string): Promise<SaveStateMetadata[]> => {
        return await saveStateStore.getItem<SaveStateMetadata[]>(`meta_${gameId}`) || [];
    }
};

// --- Settings Storage ---

export interface UserSettings {
    volume: number; // 0.0 to 1.0
    crtFilterEnabled: boolean;
    scanlinesEnabled: boolean;
    colorTheme: 'arcade-neon' | 'gameboy-dmg' | 'virtual-boy';
}

const DEFAULT_SETTINGS: UserSettings = {
    volume: 1.0,
    crtFilterEnabled: false,
    scanlinesEnabled: false,
    colorTheme: 'arcade-neon',
};

export const SettingsStorage = {
    getSettings: async (): Promise<UserSettings> => {
        const settings = await settingsStore.getItem<UserSettings>('user_settings');
        return settings || DEFAULT_SETTINGS;
    },

    updateSettings: async (newSettings: Partial<UserSettings>): Promise<UserSettings> => {
        const current = await SettingsStorage.getSettings();
        const updated = { ...current, ...newSettings };
        await settingsStore.setItem('user_settings', updated);
        return updated;
    }
};
