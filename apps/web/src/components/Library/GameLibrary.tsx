import React from 'react';
import type { ChangeEvent } from 'react';
import { Card } from '@retrovault/ui';
import { Library as LibraryIcon, X, Gamepad2 } from 'lucide-react';
import type { GameMetadata } from '@retrovault/core';
import type { PlayHistory } from '@retrovault/db';
import { GameCartridge } from './GameCartridge';

interface GameLibraryProps {
  games: GameMetadata[];
  isScanning: boolean;
  dirHandle: FileSystemDirectoryHandle | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  platformFilter: string;
  setPlatformFilter: (filter: 'ALL' | 'GBA' | 'GBC' | 'GB' | 'SNES' | 'NES') => void;
  playHistory: Record<string, PlayHistory>;
  activeGame: { metadata: GameMetadata, file: File } | null;
  setActiveGame: (game: { metadata: GameMetadata, file: File } | null) => void;
  setEmulatorInstance: (instance: any) => void;
  addLog: (message: string) => void;
  handleSelectVault: () => void;
}

export const GameLibrary: React.FC<GameLibraryProps> = ({
  games,
  isScanning,
  dirHandle,
  searchQuery,
  setSearchQuery,
  platformFilter,
  setPlatformFilter,
  playHistory,
  activeGame,
  setActiveGame,
  setEmulatorInstance,
  addLog,
  handleSelectVault,
}) => {
  const filteredGames = games.filter(game => {
    const matchesSearch = (game.title || game.fileName).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'ALL' || game.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  return (
    <Card className="flex flex-col flex-1 min-h-0 p-4 !rounded-xl !border-[0] shadow-xl bg-[#e0ddcf]">
      <div className="flex justify-between items-center px-1 mb-4">
        <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
          <LibraryIcon size={16} /> Library
        </h3>
        <button onClick={handleSelectVault} className="text-[10px] py-1 px-3 bg-[#a61022] hover:bg-[#800a16] text-white border-b-4 border-[#5a000a] active:border-b-0 active:translate-y-[2px] transition-all rounded shadow-[0_4px_8px_rgba(0,0,0,0.3)] font-bold uppercase tracking-wider">
          {dirHandle ? 'CHG VAULT' : '+ ADD VAULT'}
        </button>
      </div>

      <div className="px-1 mb-3 space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="SEARCH VAULT..."
            value={searchQuery}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a1a1a]/10 border-2 border-[#c0bdae] rounded-lg px-3 py-1.5 text-[10px] font-bold tracking-widest text-[#4a4b52] placeholder:text-[#8c897d] focus:outline-none focus:border-[#a61022] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8c897d] hover:text-[#a61022]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
          {(['ALL', 'GBA', 'GBC', 'GB', 'SNES', 'NES'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPlatformFilter(p)}
              className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest transition-all ${platformFilter === p ? 'bg-[#a61022] text-white shadow-md' : 'bg-[#c0bdae]/50 text-[#4a4b52] hover:bg-[#c0bdae]'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-3 place-items-center pr-2 custom-scrollbar relative pb-2 content-start">
        {isScanning ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--retro-neon)] space-y-2">
            <div className="w-8 h-8 border-4 border-[var(--retro-neon-dim)] border-t-[var(--retro-neon)] rounded-full animate-spin"></div>
            <p className="animate-pulse tracking-widest font-bold text-xs">SCANNING...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 col-span-2 mt-10">
            <Gamepad2 size={40} className="text-[#8c897d] mb-1" />
            <h3 className="text-sm font-black uppercase tracking-widest text-[#4a4b52]">Vault is Empty</h3>
            <button onClick={handleSelectVault} className="mt-2 text-xs py-2 px-5 bg-[#1a1a1a] hover:bg-[#222] text-[var(--retro-neon)] border-2 border-[#333] active:bg-[#000] transition-all rounded shadow-md font-bold uppercase tracking-wider">
              Mount Local Folder
            </button>
            <p className="text-[10px] text-[#8c897d] max-w-[200px] mt-4 font-bold">Select a local folder containing your specific ROM files (.gba, .sfc, .nes, etc)</p>
          </div>
        ) : (
          filteredGames.map((game: GameMetadata) => {
            const history = playHistory[game.id];
            return (
              <GameCartridge
                key={game.id}
                game={game}
                history={history}
                isActive={activeGame?.metadata.id === game.id}
                onClick={async () => {
                  try {
                    const fileHandle = await dirHandle?.getFileHandle(game.fileName);
                    const file = await fileHandle?.getFile();
                    if (file) {
                      addLog(`Booting ROM: ${game.fileName}`);
                      setActiveGame({ metadata: game, file });
                      setEmulatorInstance(null);
                    }
                  } catch (err) {
                    addLog(`Failed to load generic ROM handle.`);
                    console.error("Failed to load game file", err);
                  }
                }}
              />
            );
          })
        )}
      </div>
    </Card>
  );
};
