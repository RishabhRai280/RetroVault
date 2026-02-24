import { useState, useEffect } from 'react';
import { Button, Card } from '@retrovault/ui';
import { Gamepad2, Settings2, Menu, X } from 'lucide-react';
import { Nostalgist } from 'nostalgist';
import { scanDirectory } from '@retrovault/core';
import type { GameMetadata } from '@retrovault/core';
import { SettingsStorage, PlayHistoryStorage, type UserSettings, type KeyBindings, type PlayHistory } from '@retrovault/db';
import { EmulatorConsole } from './components/GameBoy/EmulatorConsole';
import './index.css';

/**
 * Main Application Component.
 * Contains the Core Glass-morphism dashboard layout and orchestrates the
 * File System Access logic alongside the Emulator state.
 */
function App() {
  const [games, setGames] = useState<GameMetadata[]>([]); // The active library of discovered games
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null); // The user's local directory reference
  const [isScanning, setIsScanning] = useState(false); // Global loading state for UI spinners
  const [activeGame, setActiveGame] = useState<{ metadata: GameMetadata, file: File } | null>(null); // The currently running emulator instance
  const [isInsertingCartridge, setIsInsertingCartridge] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [emulatorInstance, setEmulatorInstance] = useState<Nostalgist | null>(null);

  const [telemetry, setTelemetry] = useState({ fps: 0, ram: 0, vram: 0 });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isKeyBindingModalOpen, setIsKeyBindingModalOpen] = useState(false);
  const [listeningKey, setListeningKey] = useState<keyof KeyBindings | null>(null);
  const [playHistory, setPlayHistory] = useState<Record<string, PlayHistory>>({});

  // Load settings & history on mount
  useEffect(() => {
    SettingsStorage.getSettings().then(setUserSettings);
    PlayHistoryStorage.getAllPlayHistory().then(setPlayHistory);
  }, []);

  const updateSettings = async (updates: Partial<UserSettings>) => {
    const updated = await SettingsStorage.updateSettings(updates);
    setUserSettings(updated);
  };

  // --- KeyBinding Listener ---
  useEffect(() => {
    if (!listeningKey || !userSettings) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let keyToMap = e.key.toLowerCase();
      if (keyToMap === 'arrowup') keyToMap = 'up';
      if (keyToMap === 'arrowdown') keyToMap = 'down';
      if (keyToMap === 'arrowleft') keyToMap = 'left';
      if (keyToMap === 'arrowright') keyToMap = 'right';
      if (keyToMap === ' ') keyToMap = 'space';

      updateSettings({
        keyBindings: {
          ...userSettings.keyBindings,
          [listeningKey]: keyToMap
        }
      });
      setListeningKey(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [listeningKey, userSettings]);

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

  /* 
  const handleToggleFavorite = async (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation(); // Prevent launching the game when clicking the heart
    const isNowFavorite = await FavoritesStorage.toggleFavorite(gameId);
    if (isNowFavorite) {
      setFavorites(prev => [...prev, gameId]);
    } else {
      setFavorites(prev => prev.filter(id => id !== gameId));
    }
  };
  */

  const handleFullscreen = () => {
    const elem = document.getElementById('emulator-view');
    if (elem && elem.requestFullscreen) {
      elem.requestFullscreen();
    }
  };

  const simulateKeyDown = (button: string) => {
    if (emulatorInstance) emulatorInstance.pressDown(button);
  };

  const simulateKeyUp = (button: string) => {
    if (emulatorInstance) emulatorInstance.pressUp(button);
  };

  // Real Telemetry Loop
  useEffect(() => {
    if (!activeGame) return;
    let frames = 0;
    let prevTime = performance.now();
    let rAF: number;
    let isActive = true;

    const loop = () => {
      if (!isActive) return;
      frames++;
      const time = performance.now();
      if (time >= prevTime + 1000) {
        const fps = Math.round((frames * 1000) / (time - prevTime));
        // JS heap size tracking if available in Chromium
        const memObj = (performance as any).memory;
        const ram = memObj ? Math.round(memObj.usedJSHeapSize / 1024 / 1024) : 0;
        setTelemetry({ fps, ram, vram: Math.round(ram * 0.15) }); // mock vram based on RAM footprint
        prevTime = time;
        frames = 0;
      }
      rAF = requestAnimationFrame(loop);
    };
    rAF = requestAnimationFrame(loop);

    return () => {
      isActive = false;
      cancelAnimationFrame(rAF);
    };
  }, [activeGame]);

  const handleCloseEmulator = () => {
    setActiveGame(null);
    setEmulatorInstance(null);
    PlayHistoryStorage.getAllPlayHistory().then(setPlayHistory);
  };

  // --- Computed Properties ---
  // Just show all games for the cartridge list right now
  const filteredGames = games;

  return (
    <div className={`flex flex-col h-screen w-full bg-transparent overflow-hidden text-[#333] p-4 md:p-6 lg:p-8 theme-${userSettings?.colorTheme || 'arcade-neon'} ${userSettings?.crtFilterEnabled ? 'crt-filter' : ''} ${userSettings?.scanlinesEnabled ? 'scanlines' : ''}`}>

      {/* Global CSS Overlays for CRT affects */}
      {userSettings?.crtFilterEnabled && <div className="fixed inset-0 pointer-events-none rounded-[10%] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] z-50"></div>}
      {userSettings?.scanlinesEnabled && <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-50 opacity-20"></div>}

      {/* Mobile Top Navigation */}
      <div className="lg:hidden flex justify-between items-center bg-[#c9c6b8] p-3 rounded-lg border-2 border-[#8c897d] shadow-md z-30 shrink-0 relative mb-4">
        {/* Screws */}
        <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-[#8c897d] shadow-inner rotate-45"><div className="w-1 h-[1px] bg-[#333] mt-0.5 mx-auto"></div></div>
        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#8c897d] shadow-inner -rotate-12"><div className="w-1 h-[1px] bg-[#333] mt-0.5 mx-auto"></div></div>
        <div className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-[#8c897d] shadow-inner rotate-12"><div className="w-1 h-[1px] bg-[#333] mt-0.5 mx-auto"></div></div>
        <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-[#8c897d] shadow-inner -rotate-45"><div className="w-1 h-[1px] bg-[#333] mt-0.5 mx-auto"></div></div>

        <div className="flex items-center gap-2 pl-2">
          <span className="text-[#29225c] font-black italic text-xl tracking-wide font-serif drop-shadow-[1px_1px_0_rgba(255,255,255,0.8)]">Retro</span>
          <span className="text-[#29225c] font-black italic text-xl tracking-wide font-sans drop-shadow-[1px_1px_0_rgba(255,255,255,0.8)]">VAULT</span>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 bg-[#1a1a1a] text-[var(--retro-neon)] rounded border-2 border-[#333] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.5)] active:translate-y-px transition-transform flex gap-2 items-center z-10 mr-1"
        >
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          <span className="text-[10px] font-bold tracking-widest hidden sm:inline">{isMobileMenuOpen ? 'CLOSE' : 'MENU'}</span>
        </button>
      </div>

      {/* Key Binding Modal */}
      {isKeyBindingModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in text-[#333]">
          <Card className="w-full max-w-md p-6 bg-[#e0ddcf] border-[4px] border-[#b5b2a3] shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_4px_10px_rgba(255,255,255,0.5)] !rounded-xl relative texture-plastic">
            <button
              onClick={() => { setIsKeyBindingModalOpen(false); setListeningKey(null); }}
              className="absolute top-4 right-4 text-[#8a1955] hover:text-[#5a000a] bg-black/5 rounded-full p-1 transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-xl font-black italic text-[#29225c] border-b-4 border-[#c0bdae] pb-2 mb-6 tracking-wider uppercase">Key Binding Configuration</h2>

            <div className="space-y-4 font-mono font-bold text-sm">
              <p className="text-xs text-[#555] mb-4 text-center">Click a button, then press desired keyboard key.</p>

              <div className="grid grid-cols-2 gap-4">
                {(['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select'] as const).map(keyAction => (
                  <div key={keyAction} className="flex justify-between items-center bg-[#b5b2a3] p-2 rounded-md shadow-inner border border-[#8c897d]">
                    <span className="uppercase tracking-widest text-[#4a4b52]">{keyAction}</span>
                    <button
                      onClick={() => setListeningKey(keyAction)}
                      className={`min-w-[50px] px-3 py-1 rounded shadow-md border-b-2 active:border-b-0 active:translate-y-[2px] transition-all uppercase ${listeningKey === keyAction ? 'bg-[#39ff14] text-black border-[#228800] ring-2 ring-[#39ff14]/50' : 'bg-[#1a1a1a] text-[#39ff14] border-black'}`}
                    >
                      {listeningKey === keyAction ? '___' : userSettings?.keyBindings?.[keyAction] || '...'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <Button variant="primary" onClick={() => { setIsKeyBindingModalOpen(false); setListeningKey(null); }} className="w-full py-3 bg-[#1a1a1a] text-[var(--retro-neon)] border-2 border-[#333] shadow-md hover:bg-[#222]">DONE</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex flex-col lg:flex-row flex-1 gap-4 lg:gap-6 w-full max-w-[1600px] mx-auto overflow-y-auto lg:overflow-hidden animate-fade-in py-2 lg:py-4" style={{ animationDelay: '0.1s' }}>

        {/* Left Column: Cartridge Library */}
        <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[350px] shrink-0 h-[500px] lg:h-full gap-4`}>
          <Card className="flex-1 p-4 flex flex-col gap-4 !rounded-xl !border-[0] shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_2px_5px_rgba(255,255,255,0.8)] bg-[#e0ddcf] sticky">
            <div className="flex justify-between items-center mb-2 pb-2 border-b-2 border-[#c0bdae]">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest">Game Library</h3>
              <Button variant="primary" size="sm" onClick={handleSelectVault} className="text-xs py-1.5 px-4 bg-[#a61022] hover:bg-[#800a16] text-white border-b-4 border-[#5a000a] active:border-b-0 active:translate-y-1 transition-all rounded-full shadow-md font-bold">{dirHandle ? 'CHANGE VAULT' : '+ ADD ROM'}</Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {isScanning ? (
                <div className="flex flex-col items-center justify-center h-32 text-[var(--retro-neon)] space-y-2">
                  <div className="w-8 h-8 border-4 border-[var(--retro-neon-dim)] border-t-[var(--retro-neon)] rounded-full animate-spin"></div>
                  <p className="animate-pulse tracking-widest font-bold text-xs">SCANNING...</p>
                </div>
              ) : games.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2 opacity-50">
                  <Gamepad2 size={32} className="text-[#555] mb-2" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-[#555]">Vault is Empty</h3>
                </div>
              ) : (
                filteredGames.map((game) => {
                  const history = playHistory[game.id];
                  return (
                    <div
                      key={game.id}
                      onClick={async () => {
                        if (isInsertingCartridge) return; // Prevent spamming
                        try {
                          // @ts-ignore
                          const fileHandle = await dirHandle?.getFileHandle(game.fileName);
                          const file = await fileHandle?.getFile();
                          if (file) {
                            setIsInsertingCartridge(true);
                            // Delay emulator boot to let the CSS animation play
                            setTimeout(() => {
                              setActiveGame({ metadata: game, file });
                              setIsInsertingCartridge(false);
                              setEmulatorInstance(null); // Reset instance on load
                            }, 1200);
                          }
                        } catch (err) {
                          console.error("Failed to load game file", err);
                        }
                      }}
                      className={`relative w-full h-[120px] bg-[#8c8f94] rounded-t-xl rounded-b-md border-2 border-[#4a4b52] border-b-[6px] shadow-[0_8px_15px_rgba(0,0,0,0.3),inset_0_2px_4px_rgba(255,255,255,0.2)] cursor-pointer hover:-translate-y-2 hover:shadow-[0_12px_20px_rgba(0,0,0,0.4)] hover:bg-[#9fa2a8] transition-all duration-300 overflow-hidden flex flex-col ${activeGame?.metadata.id === game.id ? '-translate-y-4 shadow-[0_15px_25px_rgba(0,0,0,0.4)] border-[#a61022] ring-2 ring-[#a61022]' : ''}`}
                    >
                      {/* Playtime Badge */}
                      <div className="absolute top-1 right-1 bg-black/80 px-1.5 py-0.5 rounded shadow-inner flex items-center gap-1 z-30 ring-1 ring-[#555]">
                        <div className={`w-1.5 h-1.5 rounded-full ${history?.timePlayedSeconds ? 'bg-[#ffb000]' : 'bg-[#39ff14] animate-pulse shadow-[0_0_5px_#39ff14]'}`}></div>
                        <span className="text-[8px] font-black tracking-widest text-[#e0ddcf] uppercase tabular-nums">
                          {history?.timePlayedSeconds ? `${Math.floor(history.timePlayedSeconds / 60)}m` : 'NEW'}
                        </span>
                      </div>

                      {/* Cartridge Ribs */}
                      <div className="absolute left-0 right-0 bottom-2 flex justify-center gap-1 opacity-20">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="w-4 h-6 rounded-full bg-black shadow-[inset_0_2px_4px_rgba(0,0,0,1)] opacity-50"></div>
                        ))}
                      </div>

                      {/* Premium Cartridge Sticker */}
                      <div className="absolute top-2 left-2 right-2 bottom-6 bg-[#e0ddcf] rounded border-2 border-[#4a4b52] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] overflow-hidden flex relative group">
                        {game.boxArtUrl ? (
                          <img
                            src={game.boxArtUrl}
                            alt={`${game.title || game.fileName} Box Art`}
                            className="w-full h-full object-cover pixelated opacity-90 group-hover:opacity-100 transition-opacity"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center retro-pattern shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] px-3 text-center">
                            <Gamepad2 size={24} className="text-[var(--retro-neon)] opacity-30 mb-2 drop-shadow-[0_2px_2px_rgba(0,0,0,1)]" />
                            <span className="font-bold text-sm text-[var(--retro-neon)] tracking-widest uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,1)] bg-black/60 py-1 px-2 rounded border border-[var(--retro-neon-dim)] backdrop-blur-sm z-10 break-words line-clamp-3 leading-snug">{(game.title || game.fileName).replace(/\.(gba|smc|nes|gb|gbc)$/i, '')}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1.5 flex justify-between items-center backdrop-blur-sm">
                          <span className="font-bold text-[10px] uppercase tracking-widest text-white truncate w-3/4">{game.title || game.fileName}</span>
                          <span className="font-bold text-[9px] text-[var(--retro-neon)] border border-[var(--retro-neon)] px-1 rounded-sm">{game.platform}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </aside>

        {/* Center Column: Embedded Game Boy Console */}
        <div className={`flex-1 flex-col h-full bg-transparent justify-center items-center relative overflow-hidden z-20 ${isMobileMenuOpen ? 'hidden lg:flex' : 'flex'}`}>

          {/* Cartridge Insertion Animation Graphic */}
          {isInsertingCartridge && (
            <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[280px] h-[160px] bg-[#8c8f94] rounded-t-2xl border-[4px] border-[#4a4b52] animate-cartridge-insert z-0 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
              <div className="absolute bottom-4 left-4 right-4 h-20 bg-[#e0ddcf] border-2 border-[#4a4b52] flex items-center justify-center">
                <span className="font-black text-xl text-[#333] tracking-widest opacity-20">INSERTING...</span>
              </div>
            </div>
          )}

          {/* Custom RetroVault Console Shell (Scaled up for better visibility) */}
          <div className="w-[420px] h-[680px] shrink-0 bg-gradient-to-br from-[#f2f2f0] to-[#cdc9b8] rounded-tl-2xl rounded-tr-2xl rounded-bl-[2.5rem] rounded-br-[7rem] pt-6 pb-8 px-6 flex flex-col items-center shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_-5px_-5px_20px_rgba(0,0,0,0.1),inset_5px_5px_15px_rgba(255,255,255,0.8)] border-b-[8px] border-r-[4px] border-[#c0bdae] ring-1 ring-black/5 relative transform scale-[0.8] sm:scale-[0.85] lg:scale-[0.9] xl:scale-[0.95] 2xl:scale-100 origin-center transition-transform z-10 texture-plastic">

            {/* Top Grooves */}
            <div className="absolute top-0 left-4 right-4 h-6 border-b-2 border-t-2 border-[#c0bdae] opacity-50 shadow-inner"></div>

            {/* Power Switch Slider */}
            <div className="absolute top-0 left-10 w-20 h-4 bg-[#b5b2a3] rounded-b-md shadow-inner border-b border-x border-[#8c897d] flex items-end justify-center pb-0.5 cursor-pointer">
              <div className="w-12 h-2.5 bg-[#8c897d] rounded shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] flex justify-between px-1 items-center">
                <div className="w-0.5 h-1.5 bg-[#4a4a4a]"></div>
                <div className="w-0.5 h-1.5 bg-[#4a4a4a]"></div>
                <div className="w-0.5 h-1.5 bg-[#4a4a4a]"></div>
                <div className="w-0.5 h-1.5 bg-[#4a4a4a]"></div>
              </div>
            </div>

            {/* Exact DMG Screen Bezel */}
            <div className="w-full h-[260px] bg-[#61626a] rounded-t-xl rounded-b-[4rem] p-6 pt-8 shadow-[inset_0_10px_20px_rgba(0,0,0,0.6)] flex flex-col relative border-b-4 border-r-2 border-[#444] mt-2">

              {/* Battery LED & Label */}
              <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_2px_rgba(0,0,0,0.8)] border border-[#333] ${activeGame ? 'bg-[#ff0000] shadow-[0_0_8px_#ff0000,inset_0_1px_3px_rgba(255,255,255,0.8)]' : 'bg-[#4a0000]'}`}></div>
                <span className="text-[6px] font-bold text-[#b8b8b8] mt-1 tracking-widest font-sans">BATTERY</span>
              </div>

              {/* Top Text Lines */}
              <div className="absolute top-3 left-0 right-0 flex justify-center items-center gap-2">
                <div className="flex flex-col gap-[2px]">
                  <div className="w-8 h-[2px] bg-[#8a1955]"></div>
                  <div className="w-8 h-[2px] bg-[#1d1b54]"></div>
                </div>
                <span className="text-[10px] font-black text-[#888c94] tracking-widest font-sans italic">DOT MATRIX WITH STEREO SOUND</span>
                <div className="flex flex-col gap-[2px]">
                  <div className="w-8 h-[2px] bg-[#8a1955]"></div>
                  <div className="w-8 h-[2px] bg-[#1d1b54]"></div>
                </div>
              </div>

              {/* Actual Screen Content (Closer to square) */}
              <div id="emulator-view" className="flex-1 w-[220px] mx-auto bg-[#8bac0f] rounded-none overflow-hidden relative mt-1 border-[4px] border-[#222] shadow-[inset_0_0_30px_rgba(0,0,0,0.4)] ring-1 ring-[#555] h-[190px]">
                <div className="absolute inset-0 pointer-events-none opacity-20 z-10 scanlines mix-blend-overlay"></div>
                <div className="absolute inset-0 pointer-events-none opacity-10 z-10 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAABZJREFUeNpi2rV7928bEJAxcAEEAAgwADoEA3hF59UIAAAAAElFTkSuQmCC')] repeat mix-blend-multiply"></div>
                <EmulatorConsole
                  gameId={activeGame?.metadata.id || ''}
                  gameTitle={activeGame?.metadata.title || ''}
                  romFile={activeGame?.file || null}
                  platform={activeGame?.metadata.platform || 'UNKNOWN'}
                  volume={userSettings?.volume !== undefined ? userSettings.volume : 1}
                  keyBindings={userSettings?.keyBindings}
                  onClose={handleCloseEmulator}
                  onReady={setEmulatorInstance}
                />
              </div>
            </div>

            {/* Custom RetroVault Logo */}
            <div className="w-[90%] flex mt-2 mb-6 mx-auto justify-center">
              <span className="text-[#29225c] font-black italic text-xl tracking-wide font-serif">Retro</span>
              <span className="text-[#29225c] font-black italic text-xl tracking-wide font-sans px-1">VAULT</span>
              <span className="text-[#29225c] font-black text-[8px] ml-0.5 mt-1 align-top">TM</span>
            </div>

            {/* Console Controls Area */}
            <div className="w-[90%] flex-1 flex items-start justify-between px-2 relative mt-2">
              {/* Exact DMG D-PAD */}
              <div className="w-28 h-28 relative mt-6 ml-2 select-none">
                {/* D-Pad Base Shadow/Recess */}
                <div className="absolute inset-1.5 bg-[#b8b8b8] rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] blur-[2px]"></div>

                {/* Base Plus Shape (Vertical and Horizontal overlapping bars) */}
                <div className="absolute inset-x-9 top-0 bottom-0 bg-[#222] rounded-md shadow-[0_6px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] border-b-[6px] border-[#0a0a0a] z-10 flex flex-col justify-between items-center py-2 pointer-events-none">
                  <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-b-[4px] border-transparent border-b-[#444] rounded"></div>
                  <div className="w-0 h-0 border-l-[3px] border-r-[3px] border-t-[4px] border-transparent border-t-[#444] rounded mb-1"></div>
                </div>
                <div className="absolute inset-y-9 left-0 right-0 bg-[#222] rounded-md shadow-[0_6px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] border-b-[6px] border-[#0a0a0a] z-10 flex justify-between items-center px-2 pointer-events-none">
                  <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-r-[4px] border-transparent border-r-[#444] rounded"></div>
                  <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-l-[4px] border-transparent border-l-[#444] rounded"></div>
                </div>

                {/* Center Circle Override to hide the inner overlaps */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-8 h-8 rounded bg-[#222] z-10 pointer-events-none"></div>

                {/* Indentation for thumb (dead center textured) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-6 h-6 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#2a2a2a] shadow-[inset_0_4px_6px_rgba(0,0,0,0.8),0_1px_0_rgba(255,255,255,0.1)] z-20 pointer-events-none flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-black/40 blur-[1px]"></div>
                </div>

                {/* Directional Hit Zones */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-9 h-10 z-30 cursor-pointer active:bg-black/20 rounded-t-sm"
                  onPointerDown={() => simulateKeyDown('up')}
                  onPointerUp={() => simulateKeyUp('up')}
                  onPointerOut={() => simulateKeyUp('up')}
                />
                <div
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-9 h-10 z-30 cursor-pointer active:bg-black/20 rounded-b-sm"
                  onPointerDown={() => simulateKeyDown('down')}
                  onPointerUp={() => simulateKeyUp('down')}
                  onPointerOut={() => simulateKeyUp('down')}
                />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-9 z-30 cursor-pointer active:bg-black/20 rounded-l-sm"
                  onPointerDown={() => simulateKeyDown('left')}
                  onPointerUp={() => simulateKeyUp('left')}
                  onPointerOut={() => simulateKeyUp('left')}
                />
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-9 z-30 cursor-pointer active:bg-black/20 rounded-r-sm"
                  onPointerDown={() => simulateKeyDown('right')}
                  onPointerUp={() => simulateKeyUp('right')}
                  onPointerOut={() => simulateKeyUp('right')}
                />
              </div>

              {/* Exact A / B Buttons (Fixed Alignment) */}
              <div className="relative mt-[5.5rem] mr-4 w-[120px] h-[60px]">
                {/* Indentation Pill background - strictly rotated */}
                <div className="absolute inset-0 bg-[#cfccbe] rounded-[2.5rem] shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] border border-[#fff]/40 transform -rotate-[25deg] scale-110"></div>

                {/* Container for the actual buttons, also rotated to match pill */}
                <div className="absolute inset-0 flex justify-between items-center px-2 transform -rotate-[25deg]">
                  {/* B Button */}
                  <div className="flex flex-col items-center relative group select-none">
                    <div
                      className="w-[46px] h-[46px] rounded-full bg-gradient-to-br from-[#d91a5a] to-[#7a0d31] shadow-[0_5px_8px_rgba(0,0,0,0.6),inset_-2px_-4px_6px_rgba(0,0,0,0.5),inset_2px_2px_4px_rgba(255,100,150,0.6)] flex items-center justify-center border-b-[5px] border-[#4a081d] active:border-b-0 active:translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                      onPointerDown={() => simulateKeyDown('b')}
                      onPointerUp={() => simulateKeyUp('b')}
                      onPointerOut={() => simulateKeyUp('b')}
                    >
                      <div className="absolute top-1 left-2 w-4 h-2 bg-white/30 rounded-full rotate-[-45deg] blur-[1px]"></div>
                    </div>
                    {/* Counter-rotate the text so it sits flat relative to the console */}
                    <span className="text-[#29225c] font-black text-[11px] tracking-wider absolute -bottom-6 right-0 transform rotate-[25deg] pointer-events-none">B</span>
                  </div>

                  {/* A Button */}
                  <div className="flex flex-col items-center relative group select-none">
                    <div
                      className="w-[46px] h-[46px] rounded-full bg-gradient-to-br from-[#d91a5a] to-[#7a0d31] shadow-[0_5px_8px_rgba(0,0,0,0.6),inset_-2px_-4px_6px_rgba(0,0,0,0.5),inset_2px_2px_4px_rgba(255,100,150,0.6)] flex items-center justify-center border-b-[5px] border-[#4a081d] active:border-b-0 active:translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                      onPointerDown={() => simulateKeyDown('a')}
                      onPointerUp={() => simulateKeyUp('a')}
                      onPointerOut={() => simulateKeyUp('a')}
                    >
                      <div className="absolute top-1 left-2 w-4 h-2 bg-white/30 rounded-full rotate-[-45deg] blur-[1px]"></div>
                    </div>
                    {/* Counter-rotate the text so it sits flat */}
                    <span className="text-[#29225c] font-black text-[11px] tracking-wider absolute -bottom-6 right-0 transform rotate-[25deg] pointer-events-none">A</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Exact Select / Start Rubber Pills */}
            <div className="w-[60%] mx-auto flex justify-center gap-6 mt-6 pb-14 pr-8 select-none">
              <div className="flex flex-col items-center gap-2 group cursor-pointer relative">
                <div className="absolute inset-0 -m-2 bg-[#d5d2c4] rounded-full shadow-inner -z-10 transform -rotate-[22deg] scale-x-110"></div>
                <div
                  className="w-12 h-3.5 rounded-full bg-gradient-to-b from-[#b5b5b5] to-[#808080] transform -rotate-[22deg] shadow-[0_3px_5px_rgba(0,0,0,0.5),inset_-1px_-1px_3px_rgba(0,0,0,0.4),inset_1px_2px_4px_rgba(255,255,255,0.8)] border-b-[3px] border-[#555] active:border-b-0 active:translate-y-0.5 active:shadow-inner transition-all relative overflow-hidden"
                  onPointerDown={() => simulateKeyDown('select')}
                  onPointerUp={() => simulateKeyUp('select')}
                  onPointerOut={() => simulateKeyUp('select')}
                ></div>
                <span className="text-[#29225c] font-bold text-[8px] tracking-wider absolute -bottom-5 right-1 pointer-events-none">SELECT</span>
              </div>
              <div className="flex flex-col items-center gap-2 group cursor-pointer relative">
                <div className="absolute inset-0 -m-2 bg-[#d5d2c4] rounded-full shadow-inner -z-10 transform -rotate-[22deg] scale-x-110"></div>
                <div
                  className="w-12 h-3.5 rounded-full bg-gradient-to-b from-[#b5b5b5] to-[#808080] transform -rotate-[22deg] shadow-[0_3px_5px_rgba(0,0,0,0.5),inset_-1px_-1px_3px_rgba(0,0,0,0.4),inset_1px_2px_4px_rgba(255,255,255,0.8)] border-b-[3px] border-[#555] active:border-b-0 active:translate-y-0.5 active:shadow-inner transition-all relative overflow-hidden"
                  onPointerDown={() => simulateKeyDown('start')}
                  onPointerUp={() => simulateKeyUp('start')}
                  onPointerOut={() => simulateKeyUp('start')}
                ></div>
                <span className="text-[#29225c] font-bold text-[8px] tracking-wider absolute -bottom-5 right-1.5 pointer-events-none">START</span>
              </div>
            </div>

            {/* Exact Speaker Grill */}
            <div className="absolute bottom-6 right-5 flex transform -rotate-[30deg] gap-2 opacity-80">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-1.5 h-16 bg-[#99988f] rounded-full shadow-[inset_1px_2px_4px_rgba(0,0,0,0.6),1px_0_0_rgba(255,255,255,0.8)]"></div>
              ))}
            </div>
          </div>

          {/* Native Full-Screen Toggle attached to bottom of shell container */}
          <div className="mt-4 opacity-50 hover:opacity-100 transition-opacity">
            <Button variant="secondary" onClick={handleFullscreen} className="text-xs tracking-widest uppercase bg-black/40 text-white border-white/20 px-8 py-2">
              ⛶ Play In Full Screen
            </Button>
          </div>
        </div>

        {/* Right Column: Hardcore Telemetry Dashboard */}
        <aside className={`${isMobileMenuOpen ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[300px] shrink-0 h-[650px] lg:h-full gap-4 pb-8 lg:pb-0`}>
          <Card className="flex-1 p-4 flex flex-col gap-4 !rounded-xl !border-[0] shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_2px_5px_rgba(255,255,255,0.8)] bg-[#e0ddcf] relative overflow-hidden">
            {/* Background wireframe accent */}
            <div className="absolute -right-10 -top-10 text-[#c0bdae] opacity-30 pointer-events-none">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            </div>

            <div className="flex justify-between items-center border-b-[3px] border-[#c0bdae] pb-3 relative z-10">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14] animate-pulse"></div>
                Telemetry
              </h3>
            </div>

            <div className="space-y-6 relative z-10 flex-1">
              <div className="bg-[#1a1a1a] rounded-lg p-4 border-2 border-[#333] shadow-inner font-mono text-xs text-[#00ff00] leading-loose relative">
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#888]">EMULATION FPS:</span>
                  <span className={telemetry.fps > 45 ? 'text-[#39ff14]' : 'text-[#ffb000]'}>{activeGame ? telemetry.fps : '--'}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#888]">SYS ALLOCATED MEM:</span>
                  <span>{activeGame ? `${telemetry.ram} MB` : '--'}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#888]">VIDEO ALLOCATED MEM:</span>
                  <span>{activeGame ? `${telemetry.vram} MB` : '--'}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#888]">TARGET ARCH:</span>
                  <span>{activeGame ? (activeGame.metadata.platform === 'GBA' ? 'ARM7TDMI' : activeGame.metadata.platform === 'SNES' ? 'WDC 65C816' : activeGame.metadata.platform === 'NES' ? 'Ricoh 2A03' : 'GENERIC') : 'IDLE'}</span>
                </div>
              </div>

            </div>
          </Card>

          {/* Display & Settings Card */}
          <Card className="p-5 flex flex-col gap-5 !rounded-xl border-4 border-[#b5b2a3] shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_4px_10px_rgba(0,0,0,0.2),inset_0_-2px_5px_rgba(255,255,255,0.5)] bg-[#c9c6b8] texture-plastic relative">

            {/* Screws for control board look */}
            <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-[#8c897d] shadow-inner flex items-center justify-center rotate-45"><div className="w-2 h-[1px] bg-[#333]"></div></div>
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-[#8c897d] shadow-inner flex items-center justify-center -rotate-12"><div className="w-2 h-[1px] bg-[#333]"></div></div>
            <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-[#8c897d] shadow-inner flex items-center justify-center rotate-12"><div className="w-2 h-[1px] bg-[#333]"></div></div>
            <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-[#8c897d] shadow-inner flex items-center justify-center -rotate-45"><div className="w-2 h-[1px] bg-[#333]"></div></div>

            <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest border-b-[3px] border-[#8c897d] pb-2 flex items-center gap-2 mt-2">
              <Settings2 size={16} /> Hardware config
            </h3>

            <div className="space-y-6">
              {/* Volume */}
              <label className="flex flex-col gap-3">
                <div className="flex justify-between text-xs font-black uppercase text-[#4a4b52] tracking-wider">
                  <span>AUDIO.VOL</span>
                  <span className="text-[var(--retro-neon)] bg-[#1a1a1a] px-2 py-0.5 rounded shadow-inner font-mono">{Math.round((userSettings?.volume || 1) * 100)}%</span>
                </div>
                <div className="px-3 py-2 bg-[#b5b2a3] rounded-lg shadow-[inset_0_3px_6px_rgba(0,0,0,0.25)] border border-[#8c897d]">
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={userSettings?.volume || 1}
                    onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
                    className="slider-mechanical"
                  />
                </div>
              </label>

              {/* Theme Dropdown */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">LCD.THEME</span>
                <div className="relative">
                  <select
                    value={userSettings?.colorTheme || 'arcade-neon'}
                    onChange={(e) => updateSettings({ colorTheme: e.target.value as UserSettings['colorTheme'] })}
                    className="bg-[#1a1a1a] border-2 border-[#444] text-[var(--retro-neon)] p-2 rounded-md text-xs uppercase font-bold focus:outline-none w-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] appearance-none pr-8 cursor-pointer hover:border-[#666] transition-colors"
                  >
                    <option value="arcade-neon">Arcade Neon</option>
                    <option value="gameboy-dmg">Gameboy DMG</option>
                    <option value="virtual-boy">Virtual Boy</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]">▼</div>
                </div>
              </div>

              {/* Key Bindings */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">GAME.CTRL</span>
                <Button
                  onClick={() => setIsKeyBindingModalOpen(true)}
                  className="w-full bg-[#1a1a1a] text-[#aaa] hover:text-[var(--retro-neon)] border-2 border-[#444] p-2 rounded-md text-xs uppercase font-bold shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] transition-all cursor-pointer text-center"
                >
                  CONFIGURE MAPPINGS ...
                </Button>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between bg-[#b5b2a3] p-2.5 rounded-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-[#8c897d]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">DISPLAY.CRT</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.crtFilterEnabled || false} onChange={(e) => updateSettings({ crtFilterEnabled: e.target.checked })} />
                  {/* Heavy Mechanical Toggle Base */}
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-t-0 after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-x-0 bottom-[-4px] h-[4px] bg-[#ff0000] z-0 peer-checked:opacity-100 opacity-0 transition-opacity"></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between bg-[#b5b2a3] p-2.5 rounded-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-[#8c897d] mt-[-4px]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">DISPLAY.SCL</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.scanlinesEnabled || false} onChange={(e) => updateSettings({ scanlinesEnabled: e.target.checked })} />
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-t-0 after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-x-0 bottom-[-4px] h-[4px] bg-[#ff0000] z-0 peer-checked:opacity-100 opacity-0 transition-opacity"></div>
                  </div>
                </label>
              </div>
            </div>
          </Card>
        </aside>
      </main>
    </div>
  );
}

export default App;
