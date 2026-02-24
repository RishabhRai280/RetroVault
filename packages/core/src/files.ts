export interface GameMetadata {
    id: string;
    title: string;
    fileName: string;
    sizeBytes: number;
    platform: 'GBA' | 'SNES' | 'NES' | 'UNKNOWN';
    boxArtUrl?: string;
}

export interface LibraryState {
    games: GameMetadata[];
    isScanning: boolean;
    directoryHandle: FileSystemDirectoryHandle | null;
}

export const extractMetadataFromName = (fileName: string): Partial<GameMetadata> => {
    // Example: "1636 - Pokemon Fire Red (U)(Squirrels).gba"
    let title = fileName.replace(/\.[^/.]+$/, ""); // remove extension

    // Remove starting number patterns like "1636 - "
    title = title.replace(/^\d+\s*-\s*/, '');

    // Remove bracketed info like "(U)(Squirrels)" or "(USA, Europe)"
    title = title.replace(/\([^)]*\)/g, '').trim();

    let platform: GameMetadata['platform'] = 'UNKNOWN';
    if (fileName.toLowerCase().endsWith('.gba')) platform = 'GBA';
    else if (fileName.toLowerCase().endsWith('.smc') || fileName.toLowerCase().endsWith('.sfc')) platform = 'SNES';
    else if (fileName.toLowerCase().endsWith('.nes')) platform = 'NES';

    return { title, platform };
};

/**
 * Generates a Libretro thumbnail URL for a given game.
 * Libretro requires strict naming patterns, usually replacing spaces with underscores
 * and removing special characters for the URL request.
 */
export const getBoxArtUrl = (title: string, platform: GameMetadata['platform']): string | undefined => {
    if (platform === 'UNKNOWN') return undefined;

    // Map our internal platform enums to Libretro's system repository names
    const systemMap: Record<string, string> = {
        'GBA': 'Nintendo_-_Game_Boy_Advance',
        'SNES': 'Nintendo_-_Super_Nintendo_Entertainment_System',
        'NES': 'Nintendo_-_Nintendo_Entertainment_System'
    };

    const systemName = systemMap[platform];
    if (!systemName) return undefined;

    // Libretro URLs need spaces replaced with underscores, and strict URI encoding for special chars
    const formattedTitle = encodeURIComponent(title.replace(/ /g, '_'));

    // Direct link to the raw GitHub content
    return `https://raw.githubusercontent.com/libretro-thumbnails/${systemName}/master/Named_Boxarts/${formattedTitle}.png`;
};

/**
 * Traverses a user-provided directory handle using the browser's File System Access API.
 * It filters down to valid ROM extensions and builds a list of `GameMetadata` objects.
 * 
 * @param dirHandle The directory permitted for reading by the user.
 * @returns A sorted list containing metadata for all valid ROMs found.
 */
export const scanDirectory = async (dirHandle: FileSystemDirectoryHandle): Promise<GameMetadata[]> => {
    const games: GameMetadata[] = [];

    // @ts-ignore - TS dom lib might not have the full async iterator for dirHandle values
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            const isRomFile = entry.name.match(/\.(gba|smc|sfc|nes|zip)$/i);
            if (isRomFile) {
                // @ts-ignore
                const file = await entry.getFile();
                const metadata = extractMetadataFromName(entry.name);
                const titleMatch = metadata.title || entry.name;
                const platformMatch = metadata.platform || 'UNKNOWN';

                games.push({
                    id: `${entry.name}-${file.size}`,
                    fileName: entry.name,
                    title: titleMatch,
                    platform: platformMatch,
                    sizeBytes: file.size,
                    boxArtUrl: getBoxArtUrl(titleMatch, platformMatch)
                });
            }
        }
    }

    // Sort alphabetically by title
    return games.sort((a, b) => a.title.localeCompare(b.title));
};
