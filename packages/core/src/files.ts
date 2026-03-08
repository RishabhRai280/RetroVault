/**
 * @file files.ts
 * @package @retrovault/core
 * @description
 * Core ROM file scanning and metadata extraction utilities for RetroVault.
 *
 * This module is the bridge between the browser's File System Access API and
 * the React UI. It provides three pure utility functions with no React, storage,
 * or Nostalgist dependencies — making them independently testable and reusable.
 *
 * RESPONSIBILITIES:
 *  1. Traverse a user-granted directory, filter to valid ROM files
 *  2. Extract clean game titles and platform codes from raw filenames
 *  3. Generate box art CDN URLs from the official libretro-thumbnails repository
 *
 * ARCHITECTURE NOTE:
 *  ROMs are never copied or stored in the browser. Instead, a FileSystemDirectoryHandle
 *  reference grants persistent read access to the user's local folder. Individual File
 *  objects are obtained on demand by calling `dirHandle.getFileHandle(name).getFile()`.
 *  This approach allows a library of gigabytes to be "indexed" with zero browser storage cost.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Represents the complete metadata record for a single ROM file discovered during a directory scan.
 * This is the primary data type passed around the entire application once games are loaded.
 */
export interface GameMetadata {
    /**
     * Stable unique identifier for the game.
     * Derived as `${fileName}-${file.size}` (e.g., "PokemonFireRed.gba-16777216").
     * Used as the primary key for all localforage records (save states, play history).
     */
    id: string;

    /**
     * Human-readable game title extracted from the filename.
     * Cleaned of leading numbers, region codes, and group tags.
     * Example: "1636 - Pokemon Fire Red (U)(Squirrels).gba" → "Pokemon Fire Red"
     */
    title: string;

    /**
     * The original filename as it exists on disk.
     * Required for re-fetching the File object via `dirHandle.getFileHandle(fileName)`.
     */
    fileName: string;

    /**
     * File size in bytes. Used as part of the ID derivation and displayed nowhere in the current UI.
     * Could be used in future to warn users about abnormally large or small ROMs.
     */
    sizeBytes: number;

    /**
     * Detected target platform extracted from the file extension.
     * 'UNKNOWN' is used for unrecognized extensions (e.g., .zip files with ambiguous content).
     */
    platform: 'GBA' | 'GBC' | 'GB' | 'SNES' | 'NES' | 'UNKNOWN';

    /**
     * Optional URL to the game's box art image hosted on the libretro-thumbnails GitHub CDN.
     * Will be undefined when the platform is 'UNKNOWN' (no box art repository exists for generic files).
     * The image may 404 if the title doesn't match the repository's exact naming convention —
     * the UI handles this gracefully with an `onError` handler that removes the img element.
     */
    boxArtUrl?: string;

    /**
     * A short summary text of the game's plot or mechanics.
     * Pulled asynchronously via a metadata scraping service (e.g., Wikipedia/IGDB).
     */
    description?: string;

    /**
     * The original release year as a string (e.g., "1996").
     */
    releaseYear?: string;

    /**
     * The publishing or developing studio.
     */
    developer?: string;

    /**
     * Average user/critic rating scaled from 0.0 to 10.0.
     */
    rating?: number;
}

/**
 * Represents the state of the game library as managed in App.tsx.
 * Stored in a React `useState` hook in the root component.
 */
export interface LibraryState {
    /** List of all found and parsed ROMs from the last successful directory scan. */
    games: GameMetadata[];
    /** True while `scanDirectory()` is running. Used to show a loading indicator. */
    isScanning: boolean;
    /** The active directory handle. Null until the user grants access via `showDirectoryPicker()`. */
    directoryHandle: FileSystemDirectoryHandle | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses a raw ROM filename into a clean game title and detected platform.
 *
 * ROM filenames, especially from popular dump groups, follow patterns like:
 *   "1636 - Pokemon Fire Red (U)(Squirrels).gba"
 *   "Super Mario World (USA, Europe).sfc"
 *   "Sonic the Hedgehog 2 (World) [!].md"
 *
 * This function applies a series of regex transformations to extract a
 * human-readable title and platform code, suitable for display and CDN lookup.
 *
 * @param fileName - Raw filename string including extension (e.g., "1636 - Pokemon Fire Red (U).gba")
 * @returns Partial<GameMetadata> with `title` and `platform` fields populated.
 *
 * @example
 * extractMetadataFromName("1636 - Pokemon Fire Red (U)(Squirrels).gba")
 * // Returns: { title: "Pokemon Fire Red", platform: "GBA" }
 *
 * extractMetadataFromName("Super Mario World (USA, Europe).sfc")
 * // Returns: { title: "Super Mario World", platform: "SNES" }
 */
export const extractMetadataFromName = (fileName: string): Partial<GameMetadata> => {
    // Step 1: Strip the file extension (e.g., ".gba", ".smc", ".nes")
    let title = fileName.replace(/\.[^/.]+$/, "");

    // Step 2: Remove leading dump catalogue numbers (e.g., "1636 - ", "0001 - ")
    // Common in No-Intro and GoodTools ROM sets
    title = title.replace(/^\d+\s*-\s*/, '');

    // Step 3: Remove parenthetical region/group/revision codes
    // e.g., "(U)", "(USA)", "(Squirrels)", "(USA, Europe)", "(Rev 1)"
    title = title.replace(/\([^)]*\)/g, '').trim();

    // Step 4: Derive the platform from the file extension
    let platform: GameMetadata['platform'] = 'UNKNOWN';
    if (fileName.toLowerCase().endsWith('.gba')) platform = 'GBA';
    else if (fileName.toLowerCase().endsWith('.gbc')) platform = 'GBC';
    else if (fileName.toLowerCase().endsWith('.gb')) platform = 'GB';
    else if (fileName.toLowerCase().endsWith('.smc') || fileName.toLowerCase().endsWith('.sfc')) platform = 'SNES';
    else if (fileName.toLowerCase().endsWith('.nes')) platform = 'NES';
    // Files ending in .zip or .md remain 'UNKNOWN' unless further inspection is implemented

    return { title, platform };
};

/**
 * Constructs a direct URL to the official libretro-thumbnails box art image for a given game.
 *
 * The libretro-thumbnails project hosts cover art for thousands of games at:
 * `https://raw.githubusercontent.com/libretro-thumbnails/{SYSTEM}/master/Named_Boxarts/{TITLE}.png`
 *
 * URL construction rules:
 *  - Spaces in the title become underscores
 *  - Special characters are percent-encoded via `encodeURIComponent`
 *  - Platform enum maps to the exact repository folder name
 *
 * @param title - Clean game title (as returned by extractMetadataFromName)
 * @param platform - Platform enum value. Returns undefined for 'UNKNOWN'.
 * @returns Full CDN URL string, or undefined if no box art repository exists for the platform.
 *
 * @example
 * getBoxArtUrl("Pokemon Fire Red", "GBA")
 * // Returns: "https://raw.githubusercontent.com/libretro-thumbnails/Nintendo_-_Game_Boy_Advance/master/Named_Boxarts/Pokemon_Fire_Red.png"
 */
export const getBoxArtUrl = (title: string, platform: GameMetadata['platform']): string | undefined => {
    // No box art CDN available for unrecognized file types
    if (platform === 'UNKNOWN') return undefined;

    /**
     * Maps our platform enum to the exact GitHub repository folder names used by
     * the libretro-thumbnails project. These folder names are case-sensitive and
     * must exactly match the repository structure.
     */
    const systemMap: Record<string, string> = {
        'GBA': 'Nintendo_-_Game_Boy_Advance',
        'GBC': 'Nintendo_-_Game_Boy_Color',
        'GB': 'Nintendo_-_Game_Boy',
        'SNES': 'Nintendo_-_Super_Nintendo_Entertainment_System',
        'NES': 'Nintendo_-_Nintendo_Entertainment_System'
    };

    const systemName = systemMap[platform];
    if (!systemName) return undefined; // Platform has no box art repository (e.g., MD/Sega Genesis)

    /**
     * Format the title for the URL:
     * - Replace spaces with underscores (libretro naming convention)
     * - Use encodeURIComponent to handle special characters (colons, apostrophes, etc.)
     *
     * Example: "Pokémon FireRed Version" → "Pok%C3%A9mon_FireRed_Version"
     */
    const formattedTitle = encodeURIComponent(title.replace(/ /g, '_'));

    // Construct the raw GitHub CDN URL (no API rate limits for public repos via raw.githubusercontent.com)
    return `https://raw.githubusercontent.com/libretro-thumbnails/${systemName}/master/Named_Boxarts/${formattedTitle}.png`;
};

/**
 * Traverses a user-granted directory and builds a complete, sorted list of GameMetadata
 * for all valid ROM files found within.
 *
 * Uses the browser's File System Access API `FileSystemDirectoryHandle` to iterate
 * directory entries without requiring the user to upload or copy any files.
 *
 * SUPPORTED EXTENSIONS: `.gba`, `.gbc`, `.gb`, `.smc`, `.sfc`, `.nes`, `.zip`
 * Note: `.zip` files are included for broad compatibility, though the content type
 * will be marked 'UNKNOWN' and no box art will be fetched.
 *
 * @param dirHandle - A `FileSystemDirectoryHandle` obtained from `window.showDirectoryPicker()`.
 *                    The user must have granted read access to this directory.
 * @returns A Promise resolving to a `GameMetadata[]` array sorted alphabetically by title.
 *
 * @example
 * const handle = await window.showDirectoryPicker();
 * const games = await scanDirectory(handle);
 * // games = [{ id: "PokemonFireRed.gba-...", title: "Pokemon Fire Red", platform: "GBA", ... }, ...]
 */
export const scanDirectory = async (dirHandle: FileSystemDirectoryHandle): Promise<GameMetadata[]> => {
    const games: GameMetadata[] = [];

    /**
     * `dirHandle.values()` is an async iterator over all entries (files + subdirectories)
     * in the directory. The `@ts-ignore` suppresses a TypeScript lib mismatch —
     * the async iteration protocol for FileSystemDirectoryHandle is part of the File System
     * Access API spec but is not yet in TypeScript's `lib.dom.d.ts` as of TS 5.x.
     */
    // @ts-ignore - TS dom lib may not fully type the async iterator for dirHandle.values()
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            // Filter: only process files with recognized ROM extensions
            const isRomFile = entry.name.match(/\.(gba|gbc|gb|smc|sfc|nes|zip)$/i);
            if (isRomFile) {
                // @ts-ignore - FileSystemFileHandle.getFile() exists but may not be typed
                const file = await entry.getFile();

                // Extract clean title and platform from the raw filename
                const metadata = extractMetadataFromName(entry.name);
                const titleMatch = metadata.title || entry.name; // Fallback to raw name if parsing fails
                const platformMatch = metadata.platform || 'UNKNOWN';

                games.push({
                    /**
                     * ID Strategy: `${fileName}-${fileSize}`
                     * This is deterministic and stable across sessions without SHA-1 hashing.
                     * Used as the key for localforage save-state and play-history records.
                     * Collision probability is extremely low (same name AND same byte size = same game).
                     */
                    id: `${entry.name}-${file.size}`,
                    fileName: entry.name,
                    title: titleMatch,
                    platform: platformMatch,
                    sizeBytes: file.size,
                    boxArtUrl: getBoxArtUrl(titleMatch, platformMatch) // May be undefined for UNKNOWN platform
                });
            }
        }
        // Subdirectories are intentionally skipped — only flat directory scanning is supported
    }

    // Return alphabetically sorted by title for a consistent, predictable library order
    return games.sort((a, b) => a.title.localeCompare(b.title));
};
