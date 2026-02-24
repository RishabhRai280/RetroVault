import { useState } from 'react';
import { Button, Card } from '@retrovault/ui';
import { Gamepad2, FolderOpen, Play, Search, FolderSync } from 'lucide-react';
import { scanDirectory } from '@retrovault/core';
import type { GameMetadata } from '@retrovault/core';
import { EmulatorOverlay } from './components/EmulatorOverlay';
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

  // --- Computed Properties ---
  // Filter games down to those where the parsed title matches the user's search query input
  const filteredGames = games.filter(g => g.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex flex-col h-screen w-full bg-[var(--retro-darker)] overflow-hidden font-sans text-[var(--retro-text)] p-4 md:p-6 lg:p-8">

      {/* Top Navbar */}
      <header className="flex justify-between items-center w-full mb-8 pt-2 px-2 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--retro-neon)] to-blue-500 flex-center shadow-[0_0_20px_rgba(0,255,204,0.4)]">
            <Gamepad2 className="text-black" size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-white">
            RETRO<span className="text-[var(--retro-neon)]">VAULT</span>
          </h1>
        </div>

        <div className="flex gap-4">
          <Button variant="secondary" className="gap-2 rounded-full px-5 hidden sm:flex">
            <FolderSync size={18} />
            <span className="text-sm">Sync Cloud</span>
          </Button>
          <Button variant="primary" onClick={handleSelectVault} className="gap-2 rounded-full px-6 shadow-lg shadow-[var(--retro-neon-dim)] focus:ring-[var(--retro-neon)]">
            <FolderOpen size={18} />
            <span className="font-semibold tracking-wide">{dirHandle ? 'Change Vault' : 'Select Vault Context'}</span>
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 gap-6 w-full max-w-[1600px] mx-auto overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>

        {/* Left Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-full gap-4">
          <Card className="flex-1 p-5 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold text-[var(--retro-text-muted)] uppercase tracking-widest mb-4">Library</h3>
              <ul className="space-y-2">
                <li><button className="w-full text-left px-3 py-2 rounded-lg bg-white/5 text-white font-medium flex items-center justify-between">All Games <span className="text-xs bg-[var(--retro-neon-dim)] text-[var(--retro-neon)] px-2 py-0.5 rounded-md">{games.length}</span></button></li>
                <li><button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-[var(--retro-text-muted)] hover:text-white transition-colors duration-200">Favorites</button></li>
                <li><button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-[var(--retro-text-muted)] hover:text-white transition-colors duration-200">Recent</button></li>
              </ul>
            </div>

            <div className="mt-auto pt-6 border-t border-[var(--glass-border)]">
              <div className="text-xs text-[var(--retro-text-muted)] flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${dirHandle ? 'bg-[var(--retro-neon)] animate-pulse' : 'bg-red-500'}`}></div>
                {dirHandle ? 'Vault Connected' : 'Vault Disconnected'}
              </div>
            </div>
          </Card>
        </aside>

        {/* Center Grid */}
        <div className="flex flex-1 flex-col h-full bg-[var(--retro-card)] rounded-2xl border border-[var(--glass-border)] shadow-2xl relative overflow-hidden backdrop-blur-3xl">

          <div className="px-8 py-6 border-b border-[var(--glass-border)] flex justify-between items-center bg-black/20 z-10">
            <h2 className="text-xl font-bold flex items-center gap-2"><Play className="text-[var(--retro-neon)]" size={20} fill="currentColor" /> Vault Games</h2>

            <div className="relative w-64 hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--retro-text-muted)]" size={16} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                type="text"
                placeholder="Search games..."
                className="w-full bg-black/30 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[var(--retro-neon)] focus:ring-1 focus:ring-[var(--retro-neon)] transition-all text-white"
              />
            </div>
          </div>

          <div className="flex-1 p-8 overflow-y-auto">
            {isScanning ? (
              <div className="flex flex-col items-center justify-center h-full text-[var(--retro-neon)] space-y-4">
                <div className="w-12 h-12 border-4 border-[var(--retro-neon-dim)] border-t-[var(--retro-neon)] rounded-full animate-spin"></div>
                <p className="animate-pulse tracking-widest font-medium">SCANNING VAULT...</p>
              </div>
            ) : games.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                <Gamepad2 size={64} className="text-[var(--retro-text-muted)] mb-2" />
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredGames.map((game) => (
                  <Card
                    key={game.id}
                    hoverable
                    className="group flex flex-col p-4 bg-gradient-to-b from-white/5 to-transparent h-56 transition-all duration-300"
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
                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/10 rounded-lg group-hover:border-[var(--retro-neon-dim)] group-hover:bg-white/5 transition-all mb-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-tr from-[var(--retro-neon-dim)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <Gamepad2 size={40} className="text-[var(--retro-text-muted)] group-hover:text-[var(--retro-neon)] group-hover:scale-110 transition-all drop-shadow-[0_0_10px_rgba(0,255,204,0)] group-hover:drop-shadow-[0_0_10px_rgba(0,255,204,0.5)]" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-semibold text-sm truncate p-1" title={game.title}>{game.title}</h4>
                      <div className="flex justify-between items-center text-xs text-[var(--retro-text-muted)]">
                        <span className="px-2 py-0.5 rounded bg-black/40 border border-white/5">{game.platform}</span>
                        <span>{(game.sizeBytes / 1024 / 1024).toFixed(1)} MB</span>
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
          romFile={activeGame.file}
          platform={activeGame.metadata.platform}
          onClose={() => setActiveGame(null)}
        />
      )}

    </div>
  );
}

export default App;
