import { useState, useEffect } from 'react';
import { Button, Card } from '@retrovault/ui';
import { Gamepad2, Settings2, Menu, X, Maximize } from 'lucide-react';
import { Nostalgist } from 'nostalgist';
import { scanDirectory } from '@retrovault/core';
import type { GameMetadata } from '@retrovault/core';
import { SettingsStorage, PlayHistoryStorage, SaveStateStorage, type UserSettings, type KeyBindings, type PlayHistory, type SaveStateMetadata } from '@retrovault/db';
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
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [emulatorInstance, setEmulatorInstance] = useState<Nostalgist | null>(null);

  const [telemetry, setTelemetry] = useState<{ fps: number; ram: number; vram: number; history: number[] }>({ fps: 0, ram: 0, vram: 0, history: new Array(20).fill(0) });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isKeyBindingModalOpen, setIsKeyBindingModalOpen] = useState(false);
  const [listeningKey, setListeningKey] = useState<keyof KeyBindings | null>(null);
  const [playHistory, setPlayHistory] = useState<Record<string, PlayHistory>>({});

  // Phase 5 specific states
  const [systemLogs, setSystemLogs] = useState<{ time: Date; message: string }[]>([]);
  const [saveStates, setSaveStates] = useState<SaveStateMetadata[]>([]);

  const addLog = (message: string) => {
    setSystemLogs(prev => {
      const newLogs = [{ time: new Date(), message }, ...prev];
      return newLogs.slice(0, 50); // Keep last 50 logs
    });
  };

  // Fetch Save States whenever activeGame changes
  useEffect(() => {
    if (activeGame) {
      SaveStateStorage.getStatesForGame(activeGame.metadata.id).then(states => {
        // Sort descending by timestamp
        setSaveStates(states.sort((a, b) => b.timestamp - a.timestamp));
        addLog(`Loaded ${states.length} save states for ${activeGame.metadata.title || activeGame.metadata.fileName}`);
      });
    } else {
      setSaveStates([]);
    }
  }, [activeGame]);

  const handleCreateSave = async () => {
    if (!emulatorInstance || !activeGame) {
      addLog("Emulator is not currently running.");
      return;
    }
    try {
      addLog("Saving state...");
      const state = await emulatorInstance.saveState();
      const meta = await SaveStateStorage.saveState(activeGame.metadata.id, activeGame.metadata.title || activeGame.metadata.fileName, state.state);
      addLog(`Created manual save slot: ${meta.id.slice(-6)}`);

      // Refresh list
      const states = await SaveStateStorage.getStatesForGame(activeGame.metadata.id);
      setSaveStates(states.sort((a, b) => b.timestamp - a.timestamp));
    } catch (err) {
      addLog("Failed to create save state.");
      console.error(err);
    }
  };

  const handleLoadState = async (saveId: string) => {
    if (!emulatorInstance) {
      addLog("Emulator must be running to load state!");
      return;
    }
    try {
      const blob = await SaveStateStorage.loadState(saveId);
      if (blob) {
        await emulatorInstance.loadState(blob);
        addLog(`Loaded state slot ${saveId.slice(-6)}`);
      } else {
        addLog("Save state blob missing from database.");
      }
    } catch (err) {
      addLog("Failed to load generic state");
      console.error(err);
    }
  };

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
      // @ts-expect-error - TS doesn't know about window.showDirectoryPicker yet
      const handle = await window.showDirectoryPicker({
        mode: 'read',
      });

      setDirHandle(handle);
      const vaultName = handle.name;
      addLog(`Mounted Vault Directory: ${vaultName}`);

      setIsScanning(true);

      const foundGames = await scanDirectory(handle);

      addLog(`Discovered ${foundGames.length} ROMs in Vault.`);

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
    if (emulatorInstance) {
      emulatorInstance.pressDown(button);
      const canvas = document.querySelector('#emulator-view canvas') as HTMLCanvasElement;
      if (canvas) canvas.focus();
    }
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
        const memObj = (performance as { memory?: { usedJSHeapSize: number } }).memory;
        const ram = memObj ? Math.round(memObj.usedJSHeapSize / 1024 / 1024) : 0;
        setTelemetry(prev => ({
          fps,
          ram,
          vram: Math.round(ram * 0.15), // mock vram based on RAM footprint
          history: [...prev.history.slice(1), fps]
        }));
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
    <div className={`flex flex-col h-[100dvh] w-full bg-[#111] overflow-hidden text-[#333] theme-${userSettings?.colorTheme || 'arcade-neon'} ${userSettings?.crtFilterEnabled ? 'crt-filter' : ''} ${userSettings?.scanlinesEnabled ? 'scanlines' : ''}`}>

      {/* Global CSS Overlays */}
      {userSettings?.crtFilterEnabled && <div className="fixed inset-0 pointer-events-none rounded-[10%] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] z-50"></div>}
      {userSettings?.scanlinesEnabled && <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-50 opacity-20"></div>}

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-[#1a1a1a] text-[var(--retro-neon)] rounded-full border-2 border-[#333] shadow-lg active:scale-95 transition-transform flex items-center justify-center"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
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

      {/* Main Layout Container - Utilizing strictly fluid heights */}
      <main className="flex flex-1 w-full max-w-[1500px] mx-auto overflow-hidden p-2 sm:p-4 lg:p-6 gap-6 relative">

        {/* LEFT COLUMN */}
        <aside className={`${isMobileMenuOpen ? 'absolute inset-0 z-40 bg-black/90 p-4' : 'hidden'} lg:static lg:bg-transparent lg:p-0 lg:flex flex-col w-full lg:w-[340px] shrink-0 gap-4 h-full`}>

          {/* Game Library: Flexes to fill available space */}
          <Card className="flex flex-col flex-1 min-h-0 p-4 !rounded-xl !border-[0] shadow-xl bg-[#e0ddcf]">
            <div className="flex justify-between items-center mb-4 pb-2 border-b-2 border-[#c0bdae] shrink-0">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest">Library</h3>
              <Button variant="primary" size="sm" onClick={handleSelectVault} className="text-[10px] py-1.5 px-3 bg-[#a61022] hover:bg-[#800a16] text-white border-b-4 border-[#5a000a] active:border-b-0 active:translate-y-1 transition-all rounded-full shadow-md font-bold truncate max-w-[120px]">{dirHandle ? 'CHG VAULT' : '+ ADD ROM'}</Button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 gap-3 place-items-center pr-2 custom-scrollbar relative pb-2 content-start">
              {isScanning ? (
                <div className="flex flex-col items-center justify-center h-32 text-[var(--retro-neon)] space-y-2">
                  <div className="w-8 h-8 border-4 border-[var(--retro-neon-dim)] border-t-[var(--retro-neon)] rounded-full animate-spin"></div>
                  <p className="animate-pulse tracking-widest font-bold text-xs">SCANNING...</p>
                </div>
              ) : games.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50 col-span-2">
                  <Gamepad2 size={32} className="text-[#555] mb-2" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#555]">Vault is Empty</h3>
                </div>
              ) : (
                filteredGames.map((game) => {
                  const history = playHistory[game.id];
                  return (
                    <div
                      key={game.id}
                      onClick={async () => {
                        try {
                          const fileHandle = await dirHandle?.getFileHandle(game.fileName);
                          const file = await fileHandle?.getFile();
                          if (file) {
                            addLog(`Booting ROM: ${game.fileName}`);
                            setActiveGame({ metadata: game, file });
                            setEmulatorInstance(null); // Reset instance on load
                          }
                        } catch (err) {
                          addLog(`Failed to load generic ROM handle.`);
                          console.error("Failed to load game file", err);
                        }
                      }}
                      className={`relative w-[130px] h-[145px] shrink-0 bg-[#b5b5b5] rounded-t-xl rounded-b-sm border-2 border-[#8c8c8c] border-b-[6px] shadow-[0_8px_15px_rgba(0,0,0,0.3),inset_0_4px_6px_rgba(255,255,255,0.6),inset_-2px_-4px_6px_rgba(0,0,0,0.3)] cursor-pointer hover:shadow-[0_15px_25px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col pt-2 px-2 pb-3 texture-plastic ${activeGame?.metadata.id === game.id ? 'shadow-[0_15px_25px_rgba(0,0,0,0.5)] border-[#a61022] ring-2 ring-[#a61022]' : ''}`}
                    >
                      {/* Top Physical Grooves (Cartridge Grip) */}
                      <div className="absolute top-0 left-0 right-0 h-4 flex justify-between px-4 opacity-50">
                        <div className="flex gap-1.5 h-full pt-1">
                          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner"></div>
                          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner"></div>
                          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner hidden sm:block"></div>
                        </div>
                        <div className="flex gap-1.5 h-full pt-1">
                          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner hidden sm:block"></div>
                          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner"></div>
                          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner"></div>
                        </div>
                      </div>

                      {/* Direction Arrow Engraving */}
                      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-[#8c8c8c] opacity-60 shadow-[0_1px_0_rgba(255,255,255,0.4)]"></div>

                      {/* Playtime Badge (Shifted slightly) */}
                      <div className="absolute top-1 right-1 bg-black/80 px-1 py-0.5 rounded shadow-inner flex items-center gap-1 z-30 ring-1 ring-[#555]">
                        <div className={`w-1.5 h-1.5 rounded-full ${history?.timePlayedSeconds ? 'bg-[#ffb000]' : 'bg-[#39ff14] animate-pulse shadow-[0_0_5px_#39ff14]'}`}></div>
                        <span className="text-[7px] font-black tracking-widest text-[#e0ddcf] uppercase tabular-nums">
                          {history?.timePlayedSeconds ? `${Math.floor(history.timePlayedSeconds / 60)}m` : 'NEW'}
                        </span>
                      </div>

                      {/* Recessed Sticker Area */}
                      <div className="mt-8 flex-1 bg-[#8c8c8c] rounded border border-[#7a7a7a] shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)] p-0.5 relative overflow-hidden">

                        {/* The glossy physical sticker */}
                        <div className="w-full h-full bg-[#e0ddcf] rounded-sm relative overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(255,255,255,0.5)] group">

                          {/* Clean Minimalist Background */}
                          <div className="absolute inset-0 flex flex-col items-center justify-start bg-[#f2f2f0] px-2 pt-4 pb-2 text-center">
                            <span className="font-black text-[10px] sm:text-[11px] text-[#333] tracking-widest uppercase leading-tight w-full pointer-events-none border-b-2 border-[#ddd] pb-2 mb-2">
                              {(game.title || game.fileName).replace(/\.(gba|smc|nes|gb|gbc)$/i, '')}
                            </span>
                          </div>

                          {/* External Box Art */}
                          {game.boxArtUrl && (
                            <img
                              src={game.boxArtUrl}
                              alt={`${game.title || game.fileName} Box Art`}
                              className="absolute inset-0 w-full h-full object-cover pixelated opacity-95 group-hover:scale-110 transition-transform duration-700 z-10 bg-[#e0ddcf]"
                              loading="lazy"
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}

                          {/* Authentic Title Footer */}
                          <div className="absolute bottom-0 left-0 right-0 bg-white/95 px-2 flex justify-between items-center z-20 border-t-2 border-[#a61022] shadow-[0_-2px_5px_rgba(0,0,0,0.3)]">
                            <span className="font-black text-[8px] uppercase tracking-widest text-black truncate">{game.platform} GAME PAK</span>
                            <span className="font-black text-[6px] text-black border border-black px-0.5 rounded-sm tabular-nums">DMG</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
          {/* Real-time Logs Card (Middle) */}
          <Card className="shrink-0 p-4 flex flex-col gap-3 !rounded-xl !border-[0] shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_2px_5px_rgba(255,255,255,0.8)] bg-[#e0ddcf] relative overflow-hidden h-[180px]">
            <div className="flex justify-between items-center border-b-[3px] border-[#c0bdae] pb-2 relative z-10 shrink-0">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#39ff14] shadow-[0_0_5px_#39ff14] animate-pulse"></div>
                System Logs
              </h3>
            </div>
            <div className="bg-[#1a1a1a] rounded-lg p-3 border-2 border-[#333] shadow-inner font-mono text-[10px] text-[#00ff00] leading-relaxed relative flex flex-col flex-1 overflow-y-auto custom-scrollbar">
              <div className="absolute inset-0 pointer-events-none opacity-20 scanlines mix-blend-overlay"></div>
              {systemLogs.length === 0 ? (
                <span className="opacity-50 italic">Waiting for events...</span>
              ) : (
                systemLogs.map((log, i) => (
                  <div key={i} className="whitespace-normal break-words mb-1 last:mb-0">
                    <span className="opacity-50">[{log.time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span> {log.message}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Save States Card (Bottom) */}
          <Card className="flex flex-col h-[200px] shrink-0 p-4 !rounded-xl !border-[0] shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_2px_5px_rgba(255,255,255,0.8)] bg-[#e0ddcf] overflow-hidden relative">
            <div className="flex justify-between items-center border-b-[3px] border-[#c0bdae] pb-2 relative z-10 shrink-0">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <Menu size={14} className="opacity-70 text-[#4a4b52]" />
                Save States
              </h3>
              <button onClick={handleCreateSave} disabled={!emulatorInstance || !activeGame} className="text-[10px] uppercase font-bold text-[#39ff14] bg-[#1a1a1a] border border-[#333] px-2 py-0.5 rounded shadow disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#222] active:shadow-inner">
                + SAVE
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 relative z-10">
              {saveStates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50 py-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">No saves found</span>
                  <span className="text-[8px] tracking-widest text-[#555] px-4">Ensure a game is running to create or load saves.</span>
                </div>
              ) : (
                saveStates.map((save) => (
                  <div
                    key={save.id}
                    className="w-full bg-[#f2f2f0] text-left p-2 rounded-md shadow-[0_2px_5px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,1)] border border-[#a19f93] hover:bg-[#ffffff] transition-colors flex justify-between items-center group relative overflow-hidden"
                  >
                    {/* Decorative gradient tape strip */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[var(--retro-neon)] opacity-80 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex flex-col truncate pr-2 pl-2">
                      <span className="text-[10px] font-bold text-[#29225c] tracking-widest drop-shadow-[0_1px_rgba(255,255,255,0.8)]">
                        {new Date(save.timestamp).toLocaleDateString()} {new Date(save.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[8px] text-[#888] uppercase font-bold truncate tracking-widest mt-0.5">ID: {save.id.slice(0, 8)}...</span>
                    </div>
                    <button
                      onClick={() => handleLoadState(save.id)}
                      className="text-[9px] bg-[#1a1a1a] px-2 py-1 rounded shadow-md border-b-2 border-black font-black text-[var(--retro-neon)] transform active:translate-y-[2px] active:border-b-0 cursor-pointer drop-shadow-md z-10"
                    >
                      LOAD
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </aside>

        {/* Center Column: Embedded Game Boy Console */}
        <div className={`flex-1 flex items-center justify-center min-w-0 h-full relative ${isMobileMenuOpen ? 'hidden lg:flex' : 'flex'}`}>

          {/* Custom RetroVault Console Shell (Scaled up for better visibility) */}
          <div className="w-[490px] h-[860px] shrink-0 bg-gradient-to-br from-[#f2f2f0] to-[#cdc9b8] rounded-[2rem] sm:rounded-none sm:rounded-tl-2xl sm:rounded-tr-2xl sm:rounded-bl-[2.5rem] sm:rounded-br-[7rem] pt-8 sm:pt-6 pb-8 px-4 sm:px-6 flex flex-col items-center shadow-none sm:shadow-[0_30px_60px_rgba(0,0,0,0.6),inset_-5px_-5px_20px_rgba(0,0,0,0.1),inset_5px_5px_15px_rgba(255,255,255,0.8)] border-0 sm:border-b-[8px] sm:border-r-[4px] border-[#c0bdae] ring-1 ring-black/5 relative origin-center z-10 texture-plastic" style={{ transform: 'scale(min(1.15, calc(100vh / 780)))' }}>

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
            <div className="w-[95%] h-[420px] bg-[#61626a] rounded-t-xl rounded-b-[4rem] pt-8 pb-8 px-10 shadow-[inset_0_10px_20px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center relative border-b-4 border-r-2 border-[#444] mt-2 shrink-0">


              {/* Actual Screen Content */}
              <div id="emulator-view" className="w-full max-w-[450px] flex-1 bg-[#8bac0f] rounded-none overflow-hidden relative border-[4px] border-[#222] shadow-[inset_0_0_30px_rgba(0,0,0,0.4)] ring-1 ring-[#555]">
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
                  onLog={addLog}
                />
              </div>
            </div>

            {/* Authentic Logo */}
            <div className="w-[90%] flex mt-2 mb-2 mx-auto justify-start pl-[5%] items-center">
              <span className="text-[#372d80] font-black text-[10px] tracking-widest font-sans mr-1 mt-1 opacity-90">Nintendo</span>
              <span className="text-[#372d80] font-black italic text-2xl tracking-widest font-sans">GAME BOY</span>
              <span className="text-[#372d80] font-black text-[8px] ml-0.5 mt-0.5 align-top opacity-80">TM</span>
            </div>

            {/* Console Bottom Area (Controls & Speakers) */}
            <div className="w-full flex-1 flex flex-col relative px-5 mt-2">

              {/* Row 1: D-Pad and Action Buttons */}
              <div className="flex justify-between items-center w-full mt-2">

                {/* Exact DMG D-PAD */}
                <div className="w-[150px] h-[140px] relative select-none">
                  {/* D-Pad Base Shadow/Recess */}
                  <div className="absolute inset-2 bg-[#b8b8b8] rounded-full shadow-[inset_0_2px_6px_rgba(0,0,0,0.4)] blur-[1px]"></div>

                  {/* Matte Black Cross with accurate chunky arm width */}
                  <div className="absolute inset-x-[50px] top-2 bottom-2 bg-[#1c1c1c] rounded-md shadow-[0_5px_5px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] border-b-[5px] border-[#000] z-10 flex flex-col justify-between items-center py-3 pointer-events-none">
                    <div className="w-full flex flex-col gap-[4px] items-center opacity-40 mt-1"><div className="w-[24px] h-[2px] bg-[#666] rounded-full"></div><div className="w-[24px] h-[2px] bg-[#666] rounded-full"></div><div className="w-[24px] h-[2px] bg-[#666] rounded-full"></div></div>
                    <div className="w-full flex flex-col gap-[4px] items-center opacity-50 mb-1"><div className="w-[24px] h-[2px] bg-[#666] rounded-full"></div><div className="w-[24px] h-[2px] bg-[#666] rounded-full"></div><div className="w-[24px] h-[2px] bg-[#666] rounded-full"></div></div>
                  </div>
                  <div className="absolute inset-y-[48px] left-2 right-2 bg-[#1c1c1c] rounded-md shadow-[0_5px_5px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.2)] border-b-[5px] border-[#000] z-10 flex justify-between items-center px-3 pointer-events-none">
                    <div className="h-full flex gap-[4px] items-center opacity-40 ml-1"><div className="h-[24px] w-[2px] bg-[#666] rounded-full"></div><div className="h-[24px] w-[2px] bg-[#666] rounded-full"></div><div className="h-[24px] w-[2px] bg-[#666] rounded-full"></div></div>
                    <div className="h-full flex gap-[4px] items-center opacity-40 mr-1"><div className="h-[24px] w-[2px] bg-[#666] rounded-full"></div><div className="h-[24px] w-[2px] bg-[#666] rounded-full"></div><div className="h-[24px] w-[2px] bg-[#666] rounded-full"></div></div>
                  </div>

                  {/* Center Circle Override + Deep Indent */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[54px] h-[54px] rounded bg-[#1c1c1c] z-10 pointer-events-none"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[55%] w-[44px] h-[44px] rounded-full bg-[#111] shadow-[inset_0_4px_6px_rgba(0,0,0,0.9),0_1px_1px_rgba(255,255,255,0.1)] z-20 pointer-events-none"></div>

                  {/* Directional Hit Zones */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[55px] h-[55px] z-30 cursor-pointer active:bg-white/10 rounded-t-lg" onPointerDown={() => simulateKeyDown('up')} onPointerUp={() => simulateKeyUp('up')} onPointerOut={() => simulateKeyUp('up')} />
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[55px] h-[55px] z-30 cursor-pointer active:bg-white/10 rounded-b-lg" onPointerDown={() => simulateKeyDown('down')} onPointerUp={() => simulateKeyUp('down')} onPointerOut={() => simulateKeyUp('down')} />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[55px] h-[55px] z-30 cursor-pointer active:bg-white/10 rounded-l-lg" onPointerDown={() => simulateKeyDown('left')} onPointerUp={() => simulateKeyUp('left')} onPointerOut={() => simulateKeyUp('left')} />
                  <div className="absolute right-0 left-auto top-1/2 -translate-y-1/2 w-[55px] h-[55px] z-30 cursor-pointer active:bg-white/10 rounded-r-lg" onPointerDown={() => simulateKeyDown('right')} onPointerUp={() => simulateKeyUp('right')} onPointerOut={() => simulateKeyUp('right')} />
                </div>

                {/* Exact A / B Buttons */}
                <div className="relative mt-[3rem] w-[155px] h-[60px] mr-2">
                  {/* Indentation Pill background */}
                  <div className="absolute inset-0 bg-[#c0bdae] rounded-[3rem] shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_1px_1px_rgba(255,255,255,0.7)] transform -rotate-[25deg] scale-105"></div>

                  <div className="absolute inset-0 flex justify-between items-center px-[8px] transform -rotate-[25deg]">
                    {/* B Button */}
                    <div className="flex flex-col items-center relative group select-none">
                      <div
                        className="w-[56px] h-[56px] rounded-full bg-[#8c1f54] shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_-1px_-3px_5px_rgba(0,0,0,0.5),inset_1px_2px_4px_rgba(255,100,150,0.3)] flex items-center justify-center border-b-[4px] border-[#4a0827] active:border-b-0 active:translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                        onPointerDown={() => simulateKeyDown('b')}
                        onPointerUp={() => simulateKeyUp('b')}
                        onPointerOut={() => simulateKeyUp('b')}
                      ></div>
                      <span className="text-[#372d80] font-black text-[12px] tracking-widest absolute -bottom-7 right-[-4px] transform rotate-[25deg] pointer-events-none">B</span>
                    </div>

                    {/* A Button */}
                    <div className="flex flex-col items-center relative group select-none">
                      <div
                        className="w-[56px] h-[56px] rounded-full bg-[#8c1f54] shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_-1px_-3px_5px_rgba(0,0,0,0.5),inset_1px_2px_4px_rgba(255,100,150,0.3)] flex items-center justify-center border-b-[4px] border-[#4a0827] active:border-b-0 active:translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                        onPointerDown={() => simulateKeyDown('a')}
                        onPointerUp={() => simulateKeyUp('a')}
                        onPointerOut={() => simulateKeyUp('a')}
                      ></div>
                      <span className="text-[#372d80] font-black text-[12px] tracking-widest absolute -bottom-7 right-[-4px] transform rotate-[25deg] pointer-events-none">A</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Select/Start and Speaker Grill */}
              <div className="flex justify-between items-end w-full mt-auto pb-6 px-4">

                {/* Select / Start Rubber Pills */}
                <div className="flex gap-[1.8rem] ml-[50px] pb-[10px] select-none">

                  {/* Select */}
                  <div className="flex flex-col items-center gap-1 cursor-pointer">
                    <div className="w-[65px] h-[35px] bg-[#c0bdae] rounded-full shadow-[inset_0_3px_5px_rgba(0,0,0,0.4),0_1px_1px_rgba(255,255,255,0.8)] flex items-center justify-center transform -rotate-[22deg] group relative">
                      <div
                        className="w-[55px] h-[25px] rounded-full bg-[#4a4d52] shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.2)] border-b-[2px] border-[#222] absolute active:border-b-0 active:translate-y-[1px] transition-all"
                        onPointerDown={() => simulateKeyDown('select')}
                        onPointerUp={() => simulateKeyUp('select')}
                        onPointerOut={() => simulateKeyUp('select')}
                      ></div>
                    </div>
                    <span className="text-[#372d80] font-black text-[10px] tracking-wider transform -rotate-[22deg] pointer-events-none mr-3 mt-1.5 opacity-90">SELECT</span>
                  </div>

                  {/* Start */}
                  <div className="flex flex-col items-center gap-1 cursor-pointer">
                    <div className="w-[65px] h-[35px] bg-[#c0bdae] rounded-full shadow-[inset_0_3px_5px_rgba(0,0,0,0.4),0_1px_1px_rgba(255,255,255,0.8)] flex items-center justify-center transform -rotate-[22deg] group relative">
                      <div
                        className="w-[55px] h-[25px] rounded-full bg-[#4a4d52] shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.2)] border-b-[2px] border-[#222] absolute active:border-b-0 active:translate-y-[1px] transition-all"
                        onPointerDown={() => simulateKeyDown('start')}
                        onPointerUp={() => simulateKeyUp('start')}
                        onPointerOut={() => simulateKeyUp('start')}
                      ></div>
                    </div>
                    <span className="text-[#372d80] font-black text-[10px] tracking-wider transform -rotate-[22deg] pointer-events-none mr-3 mt-1.5 opacity-90">START</span>
                  </div>

                </div>

                {/* Speaker Grill */}
                <div className="flex gap-[10px] mt-10 opacity-85">
                  <div className="w-[10px] h-[75px] rounded-full bg-[#9c998c] shadow-[inset_3px_2px_5px_rgba(0,0,0,0.6),1px_1px_1px_rgba(255,255,255,0.5)] transform -rotate-[-25deg]"></div>
                  <div className="w-[10px] h-[75px] rounded-full bg-[#9c998c] shadow-[inset_3px_2px_5px_rgba(0,0,0,0.6),1px_1px_1px_rgba(255,255,255,0.5)] transform -rotate-[-25deg]"></div>
                  <div className="w-[10px] h-[75px] rounded-full bg-[#9c998c] shadow-[inset_3px_2px_5px_rgba(0,0,0,0.6),1px_1px_1px_rgba(255,255,255,0.5)] transform -rotate-[-25deg]"></div>
                  <div className="w-[10px] h-[75px] rounded-full bg-[#9c998c] shadow-[inset_3px_2px_5px_rgba(0,0,0,0.6),1px_1px_1px_rgba(255,255,255,0.5)] transform -rotate-[-25deg]"></div>
                  <div className="w-[10px] h-[75px] rounded-full bg-[#9c998c] shadow-[inset_3px_2px_5px_rgba(0,0,0,0.6),1px_1px_1px_rgba(255,255,255,0.5)] transform -rotate-[-25deg]"></div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Hardcore Telemetry Dashboard */}
        <aside className={`${isMobileMenuOpen ? 'hidden' : 'hidden'} lg:flex flex-col w-full lg:w-[320px] shrink-0 gap-4 h-full`}>
          <Card className="shrink-0 p-4 flex flex-col gap-3 !rounded-xl !border-[0] shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_2px_5px_rgba(255,255,255,0.8)] bg-[#e0ddcf] relative overflow-hidden flex-1">
            {/* Background wireframe accent */}
            <div className="absolute -right-10 -top-10 text-[#c0bdae] opacity-30 pointer-events-none">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
            </div>

            <div className="flex justify-between items-center border-b-[3px] border-[#c0bdae] pb-2 relative z-10 shrink-0">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14] animate-pulse"></div>
                Telemetry
              </h3>
            </div>

            <div className="flex flex-col gap-4 relative z-10 flex-1 min-h-0">
              <div className="bg-[#1a1a1a] rounded-lg p-3 border-2 border-[#333] shadow-inner font-mono text-[10px] sm:text-xs text-[#00ff00] leading-normal relative flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>

                {/* Real-time FPS Graph */}
                <div className="flex items-end h-16 border-b border-[#333] pb-1 gap-[2px] mt-1 mb-2">
                  {telemetry.history && telemetry.history.map((val: number, i: number) => (
                    <div
                      key={i}
                      className={`flex-1 transition-all duration-300 ${val > 45 ? 'bg-[var(--retro-neon)]' : val > 0 ? 'bg-[#ffb000]' : 'bg-[#222]'}`}
                      style={{ height: `${Math.max(5, Math.min(100, (val / 60) * 100))}%` }}
                    ></div>
                  ))}
                </div>

                <div className="flex justify-between mb-1">
                  <span className="text-[#888] font-bold">EMULATION FPS:</span>
                  <span className={telemetry.fps > 45 ? 'text-[var(--retro-neon)] font-bold' : 'text-[#ffb000] font-bold'}>{activeGame ? telemetry.fps : '--'}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#888] font-bold">SYS RAM ALLOC:</span>
                  <span className="text-[var(--retro-neon)] opacity-80">{activeGame ? `${telemetry.ram} MB` : '--'}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#888] font-bold">VRAM ALLOC:</span>
                  <span className="text-[var(--retro-neon)] opacity-80">{activeGame ? `${telemetry.vram} MB` : '--'}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-[#888] font-bold">TARGET ARCH:</span>
                  <span className="text-[var(--retro-neon)] opacity-80">{activeGame ? (activeGame.metadata.platform === 'GBA' ? 'ARM7TDMI' : activeGame.metadata.platform === 'SNES' ? 'WDC 65C816' : activeGame.metadata.platform === 'NES' ? 'Ricoh 2A03' : 'GENERIC') : 'IDLE'}</span>
                </div>
              </div>

              {/* Relocated Full Screen Button */}
              <div className="shrink-0 mt-auto pb-1">
                <button
                  onClick={handleFullscreen}
                  className="w-full relative group overflow-hidden bg-[#a61022] text-[#fff] border-[3px] border-[#5a000a] rounded p-2 shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.2)] transition-all hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)] active:translate-y-[2px] active:shadow-inner flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Maximize size={14} className="drop-shadow-[0_2px_2px_rgba(0,0,0,1)]" />
                  <span className="font-black text-[10px] uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)] z-10">Play in Full Screen</span>
                </button>
              </div>
            </div>
          </Card>

          {/* Display & Settings Card */}
          {/* Display & Settings Card */}
          <Card className="shrink-0 p-4 flex flex-col gap-4 !rounded-xl !border-[0] shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_2px_5px_rgba(255,255,255,0.8)] bg-[#e0ddcf] relative overflow-y-auto custom-scrollbar flex-1 min-h-0">

            <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest border-b-[3px] border-[#c0bdae] pb-2 flex items-center gap-2 mt-1 shrink-0">
              <Settings2 size={16} /> Hardware config
            </h3>

            <div className="space-y-4">
              {/* Volume */}
              <label className="flex flex-col gap-2">
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
                    className="slider-mechanical w-full min-w-full block"
                  />
                </div>
              </label>

              {/* Theme Dropdown */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">LCD.THEME</span>
                <div className="relative">
                  <select
                    value={userSettings?.colorTheme || 'arcade-neon'}
                    onChange={(e) => updateSettings({ colorTheme: e.target.value as UserSettings['colorTheme'] })}
                    className="bg-[#1a1a1a] border-2 border-[#444] text-[var(--retro-neon)] p-1.5 rounded-md text-xs uppercase font-bold focus:outline-none w-full shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] appearance-none pr-8 cursor-pointer hover:border-[#666] transition-colors"
                  >
                    <option value="arcade-neon">Arcade Neon</option>
                    <option value="gameboy-dmg">Gameboy DMG</option>
                    <option value="virtual-boy">Virtual Boy</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]">▼</div>
                </div>
              </div>

              {/* Key Bindings */}
              <div className="flex flex-col gap-2 pb-2">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">GAME.CTRL</span>
                <button
                  type="button"
                  onClick={() => setIsKeyBindingModalOpen(true)}
                  className="w-full bg-[#1a1a1a] text-[var(--retro-neon)] hover:bg-[#222] border-2 border-[#444] p-2 rounded-md text-xs uppercase font-bold shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] transition-all cursor-pointer text-center tracking-widest"
                >
                  Configure Mappings
                </button>
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

      </main >
    </div >
  );
}

export default App;
