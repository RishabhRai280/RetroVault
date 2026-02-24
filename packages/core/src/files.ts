export interface GameMetadata {
    id: string;
    title: string;
    fileName: string;
    sizeBytes: number;
    platform: 'GBA' | 'SNES' | 'NES' | 'UNKNOWN';
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

                games.push({
                    id: `${entry.name}-${file.size}`,
                    fileName: entry.name,
                    title: metadata.title || entry.name,
                    platform: metadata.platform || 'UNKNOWN',
                    sizeBytes: file.size
                });
            }
        }
    }

    // Sort alphabetically by title
    return games.sort((a, b) => a.title.localeCompare(b.title));
};
