import { useState, useEffect } from 'react';
import { Button, Card } from '@retrovault/ui';
import { Gamepad2, FolderOpen, Play, Search, FolderSync, Heart, LayoutGrid, List, Settings2 } from 'lucide-react';
import { scanDirectory } from '@retrovault/core';
import type { GameMetadata } from '@retrovault/core';
import { FavoritesStorage, SettingsStorage, type UserSettings } from '@retrovault/db';
import { EmulatorOverlay } from './components/EmulatorOverlay';
import { SettingsModal } from './components/SettingsModal';
import './index.css';

/**
 * Main Application Component.
 * Contains the Core Glass-morphism dashboard layout and orchestrates the
 * File System Access logic alongside the Emulator state.
 */
function App() {
  // --- State Management ---
  const [games, setGames] = useState<GameMetadata[]>([]); // The active library of discovered games
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null); // The user's local directory reference
  const [isScanning, setIsScanning] = useState(false); // Global loading state for UI spinners
  const [searchQuery, setSearchQuery] = useState(''); // Text value for the search bar filter
  const [activeGame, setActiveGame] = useState<{ metadata: GameMetadata, file: File } | null>(null); // The currently running emulator instance
  const [favorites, setFavorites] = useState<string[]>([]); // Array of favorited game IDs
  const [viewFilter, setViewFilter] = useState<'ALL' | 'FAVORITES'>('ALL'); // Active UI view
  const [viewLayout, setViewLayout] = useState<'GRID' | 'LIST'>('GRID'); // Grid vs. List mode
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

  // Load favorites on mount
  useEffect(() => {
    FavoritesStorage.getFavorites().then(setFavorites);
  }, []);

  // Load settings on mount and when Settings Modal closes
  useEffect(() => {
    if (!isSettingsOpen) {
      SettingsStorage.getSettings().then(setUserSettings);
    }
  }, [isSettingsOpen]);

  // --- Handlers ---
  /**
   * Triggers the Browser's native File System Access dialog.
   * Prompts the user to select their `/Games` folder, granting the app read permissions.
   */
  const handleSelectVault = async () => {
    try {
      // @ts-ignore - TS doesn't know about window.showDirectoryPicker yet
      const handle = await window.showDirectoryPicker({
        mode: 'read',
      });

      setDirHandle(handle);
      setIsScanning(true);

      const foundGames = await scanDirectory(handle);
      setGames(foundGames);
      setIsScanning(false);

    } catch (err) {
      console.error("Failed to select directory:", err);
      setIsScanning(false);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation(); // Prevent launching the game when clicking the heart
    const isNowFavorite = await FavoritesStorage.toggleFavorite(gameId);
    if (isNowFavorite) {
      setFavorites(prev => [...prev, gameId]);
    } else {
      setFavorites(prev => prev.filter(id => id !== gameId));
    }
  };

  // --- Computed Properties ---
  // Filter games based on search query AND the current view tab
  let filteredGames = games.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));
  if (viewFilter === 'FAVORITES') {
    filteredGames = filteredGames.filter(g => favorites.includes(g.id));
  }

  return (
    <div className={`flex flex-col h-screen w-full bg-[var(--retro-darker)] overflow-hidden text-[var(--retro-text)] p-4 md:p-6 lg:p-8 theme-${userSettings?.colorTheme || 'arcade-neon'} ${userSettings?.crtFilterEnabled ? 'crt-filter' : ''} ${userSettings?.scanlinesEnabled ? 'scanlines' : ''}`}>

      {/* Global CSS Overlays for CRT affects */}
      {userSettings?.crtFilterEnabled && <div className="fixed inset-0 pointer-events-none rounded-[10%] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] z-50"></div>}
      {userSettings?.scanlinesEnabled && <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-50 opacity-20"></div>}

      {/* Top Navbar */}
      <header className="flex justify-between items-center w-full mb-8 pt-2 px-2 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 border-[3px] border-[var(--retro-neon)] bg-black flex items-center justify-center shadow-[4px_4px_0_var(--retro-neon)]">
            <Gamepad2 className="text-[var(--retro-neon)]" size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-widest text-white uppercase text-shadow-glow">
            RETRO<span className="text-[var(--retro-neon)]">VAULT</span>
          </h1>
        </div>

        <div className="flex gap-4">
          <Button variant="secondary" className="gap-2 px-6 hidden sm:flex text-xs" title="Sync Cloud">
            <FolderSync size={18} /> Sync
          </Button>
          <Button variant="secondary" onClick={() => setIsSettingsOpen(true)} className="gap-2 px-4" title="Settings">
            <Settings2 size={18} />
          </Button>
          <Button variant="primary" onClick={handleSelectVault} className="gap-2 px-6 text-xs shadow-none hover:shadow-none">
            <FolderOpen size={18} /> {dirHandle ? 'Change Vault' : 'Select Vault Context'}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 gap-6 w-full max-w-[1600px] mx-auto overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>

        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 h-full gap-4">
          <Card className="flex-1 p-5 flex flex-col gap-6 !rounded-none !border-[var(--retro-neon)] border-4 shadow-[8px_8px_0_rgba(57,255,20,0.3)] bg-black">
            <div>
              <h3 className="text-lg font-bold text-[var(--retro-neon)] uppercase tracking-widest mb-4 border-b-4 border-[var(--retro-neon)] pb-2 text-shadow-glow">Library</h3>
              <ul className="space-y-4">
                <li>
                  <button
                    onClick={() => setViewFilter('ALL')}
                    className={`w-full text-left px-3 py-3 font-bold uppercase text-[10px] flex items-center justify-between transition-colors duration-200 border-2 ${viewFilter === 'ALL' ? 'bg-[var(--retro-neon)] text-black border-[var(--retro-neon)]' : 'border-transparent text-[var(--retro-text-muted)] hover:text-white hover:border-[var(--retro-neon)]/50'}`}
                  >
                    All Games <span className={`text-[10px] px-2 py-0.5 border ${viewFilter === 'ALL' ? 'border-black bg-black text-[var(--retro-neon)]' : 'border-[var(--retro-neon)] text-[var(--retro-neon)]'}`}>{games.length}</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setViewFilter('FAVORITES')}
                    className={`w-full text-left px-3 py-3 font-bold uppercase text-[10px] flex items-center justify-between transition-colors duration-200 border-2 ${viewFilter === 'FAVORITES' ? 'bg-[var(--retro-neon)] text-black border-[var(--retro-neon)]' : 'border-transparent text-[var(--retro-text-muted)] hover:text-white hover:border-[var(--retro-neon)]/50'}`}
                  >
                    Favorites <span className={`text-[10px] px-2 py-0.5 border ${viewFilter === 'FAVORITES' ? 'border-black bg-black text-[var(--retro-neon)]' : 'border-[var(--retro-neon)] text-[var(--retro-neon)]'}`}>{favorites.length}</span>
                  </button>
                </li>
                <li><button className="w-full text-left px-3 py-3 font-bold uppercase text-[10px] text-[var(--retro-text-muted)] hover:text-white transition-colors duration-200 border-2 border-transparent hover:border-[var(--retro-neon)]/50">Recent</button></li>
              </ul>
            </div>

            <div className="mt-auto pt-6 border-t-2 border-[var(--retro-neon)]">
              <div className="text-[8px] uppercase font-bold text-[var(--retro-text-muted)] flex items-center gap-3 tracking-widest">
                <div className={`w-4 h-4 border-2 border-black shadow-[2px_2px_0_0_rgba(255,255,255,0.2)] ${dirHandle ? 'bg-[var(--retro-neon)] animate-pulse' : 'bg-red-500'}`}></div>
                {dirHandle ? 'Vault Connected' : 'Vault Disconnected'}
              </div>
            </div>
          </Card>
        </aside>

        {/* Center Grid */}
        <div className="flex flex-1 flex-col h-full bg-black border-4 border-[var(--retro-neon)] shadow-[8px_8px_0_rgba(57,255,20,0.3)] relative overflow-hidden">

          <div className="px-6 py-4 border-b-4 border-[var(--retro-neon)] flex flex-col md:flex-row gap-4 justify-between items-center bg-[var(--retro-neon)]/10 z-10">
            <h2 className="text-xl font-bold flex items-center gap-4 uppercase tracking-widest text-[var(--retro-neon)] text-shadow-glow">
              <Play className="text-[var(--retro-neon)]" size={24} fill="currentColor" /> Vault Games
            </h2>

            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* View Toggles */}
              <div className="flex bg-black border-2 border-[var(--retro-neon)] p-1">
                <button
                  onClick={() => setViewLayout('GRID')}
                  className={`p-2 transition-colors ${viewLayout === 'GRID' ? 'bg-[var(--retro-neon)] text-black' : 'text-[var(--retro-neon)] hover:bg-[var(--retro-neon)]/20'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewLayout('LIST')}
                  className={`p-2 transition-colors ${viewLayout === 'LIST' ? 'bg-[var(--retro-neon)] text-black' : 'text-[var(--retro-neon)] hover:bg-[var(--retro-neon)]/20'}`}
                  title="List View"
                >
                  <List size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--retro-text-muted)]" size={16} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder="SEARCH..."
                  className="w-full bg-black border-2 border-[var(--retro-neon)] py-2.5 pl-10 pr-4 text-[10px] font-bold uppercase focus:outline-none focus:bg-[#111] transition-all text-[var(--retro-neon)] placeholder-[var(--retro-text-muted)]"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto">
            {isScanning ? (
              <div className="flex flex-col items-center justify-center h-full text-[var(--retro-neon)] space-y-4">
                <div className="w-12 h-12 border-4 border-[var(--retro-neon-dim)] border-t-[var(--retro-neon)] rounded-full animate-spin"></div>
                <p className="animate-pulse tracking-widest font-medium">SCANNING VAULT...</p>
              </div>
            ) : games.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-70">
                <div className="animate-float">
                  <Gamepad2 size={64} className="text-[var(--retro-text-muted)] mb-2 drop-shadow-md" />
                </div>
                <h3 className="text-2xl font-medium">Vault is Empty</h3>
                <p className="max-w-md text-[var(--retro-text-muted)]">
                  {!dirHandle
                    ? "Click 'Select Vault Context' in the top right to give access to your local Games directory."
                    : "No supported ROMs found in the selected folder."}
                </p>
                {!dirHandle && (
                  <Button variant="secondary" onClick={handleSelectVault} className="mt-4 gap-2">
                    <FolderOpen size={16} /> Choose Folder
                  </Button>
                )}
              </div>
            ) : (
              <div className={viewLayout === 'GRID' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" : "flex flex-col gap-3"}>
                {filteredGames.map((game) => (
                  <Card
                    key={game.id}
                    hoverable
                    className={`group bg-black p-2 transition-all duration-200 cursor-pointer flex ${viewLayout === 'GRID' ? 'flex-col h-72' : 'flex-row items-center gap-4 h-28'}`}
                    onClick={async () => {
                      try {
                        // @ts-ignore
                        const fileHandle = await dirHandle?.getFileHandle(game.fileName);
                        const file = await fileHandle?.getFile();
                        if (file) {
                          setActiveGame({ metadata: game, file });
                        }
                      } catch (err) {
                        console.error("Failed to load game file", err);
                      }
                    }}
                  >
                    <div className={`relative flex items-center justify-center border-4 border-[var(--retro-neon)] bg-[#0a0a0a] overflow-hidden group-hover:bg-[#1a1a1a] transition-colors ${viewLayout === 'GRID' ? 'flex-1 mb-2' : 'w-24 h-full'}`}>

                      {game.boxArtUrl ? (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center p-0">
                          <img
                            src={game.boxArtUrl}
                            alt={`${game.title} Box Art`}
                            className="w-full h-full object-cover pixelated opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const sibling = e.currentTarget.parentElement?.nextElementSibling as HTMLElement;
                              if (sibling) sibling.style.display = 'block';
                            }}
                          />
                        </div>
                      ) : null}

                      {/* Fallback Icon */}
                      <Gamepad2
                        size={viewLayout === 'GRID' ? 48 : 32}
                        style={{ display: game.boxArtUrl ? 'none' : 'block' }}
                        className="text-[var(--retro-neon)] opacity-30 group-hover:opacity-100 group-hover:scale-125 transition-all drop-shadow-[4px_4px_0px_rgba(57,255,20,0.2)]"
                      />

                      {/* Heart Button Overlay */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, game.id)}
                        className={`absolute p-1.5 bg-black border-2 border-[var(--retro-neon)] hover:bg-[var(--retro-neon)] group/btn transition-colors z-10 ${viewLayout === 'GRID' ? 'top-2 right-2' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100'}`}
                      >
                        <Heart
                          size={14}
                          className={favorites.includes(game.id) ? "fill-red-500 text-red-500" : "text-[var(--retro-neon)] group-hover/btn:text-black"}
                        />
                      </button>
                    </div>

                    <div className={`flex flex-col justify-center ${viewLayout === 'GRID' ? 'h-16 px-1' : 'flex-1 pr-2'}`}>
                      <h4 className="font-bold text-[10px] leading-tight line-clamp-2 uppercase tracking-widest text-shadow-glow group-hover:text-[var(--retro-neon)] transition-colors mb-2" title={game.title}>
                        {game.title}
                      </h4>
                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-[9px] bg-[var(--retro-neon)] text-black px-1.5 py-0.5 font-bold uppercase shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">
                          {game.platform}
                        </span>
                        <div className="flex items-center gap-2">
                          {viewLayout === 'LIST' && favorites.includes(game.id) && (
                            <Heart size={12} className="fill-red-500 text-red-500" />
                          )}
                          <span className="text-[9px] text-[var(--retro-text-muted)] tracking-wider">
                            {(game.sizeBytes / 1024 / 1024).toFixed(1)}MB
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

        </div>

      </main>

      {/* Emulator Overlay */}
      {activeGame && (
        <EmulatorOverlay
          gameId={activeGame.metadata.id}
          gameTitle={activeGame.metadata.title}
          romFile={activeGame.file}
          platform={activeGame.metadata.platform}
          onClose={() => setActiveGame(null)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Global Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

    </div>
  );
}

export default App;
