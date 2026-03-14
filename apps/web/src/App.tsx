import { useState, useEffect, useRef, type ChangeEvent, type SyntheticEvent } from 'react';
import { Card } from '@retrovault/ui';
import { Gamepad2, Settings2, Library, Save, ScrollText, Activity, SlidersHorizontal, X, Menu, Maximize } from 'lucide-react';
import { Nostalgist } from 'nostalgist';
import { scanDirectory, fetchGameMetadata } from '@retrovault/core';
import type { GameMetadata } from '@retrovault/core';
import { SettingsStorage, PlayHistoryStorage, SaveStateStorage, MetadataStorage, DEFAULT_SETTINGS, type UserSettings, type KeyBindings, type PlayHistory, type SaveStateMetadata } from '@retrovault/db';
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
  // consoleScale: computed from the actual container pixel size by ResizeObserver.
  // This is the only reliable cross-device way to fit the 490×860 Game Boy shell.
  const [consoleScale, setConsoleScale] = useState(1);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'library' | 'saves' | 'logs' | 'telemetry' | 'config'>('library');
  const [isKeyBindingModalOpen, setIsKeyBindingModalOpen] = useState(false);
  const [listeningKey, setListeningKey] = useState<keyof KeyBindings | null>(null);
  const [playHistory, setPlayHistory] = useState<Record<string, PlayHistory>>({});

  // Phase 7 specific states (Casing)
  const [isCasingModalOpen, setIsCasingModalOpen] = useState(false);
  const defaultCasingTheme: import('@retrovault/db').CasingTheme = { type: 'classic', classicId: 'plastic-gray', solidColor: '#b5b5b5', gradient: { colorFrom: '#e66465', colorTo: '#9198e5', direction: 'to bottom right' }, imageUrl: '' };
  const currentCasing = userSettings?.casingTheme || defaultCasingTheme;
  const [tempCasing, setTempCasing] = useState(currentCasing);

  // Phase 5 specific states
  const [systemLogs, setSystemLogs] = useState<{ time: Date; message: string }[]>([]);
  const [saveStates, setSaveStates] = useState<SaveStateMetadata[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'GBA' | 'GBC' | 'GB' | 'SNES' | 'NES'>('ALL');

  const addLog = (message: string) => {
    setSystemLogs((prev: { time: Date; message: string }[]) => {
      const newLogs = [{ time: new Date(), message }, ...prev];
      return newLogs.slice(0, 50); // Keep last 50 logs
    });
  };

  // Fetch Save States whenever activeGame changes
  useEffect(() => {
    if (activeGame) {
      SaveStateStorage.getStatesForGame(activeGame.metadata.id).then((states: SaveStateMetadata[]) => {
        // Sort descending by timestamp
        setSaveStates(states.sort((a: SaveStateMetadata, b: SaveStateMetadata) => b.timestamp - a.timestamp));
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
      setSaveStates(states.sort((a: SaveStateMetadata, b: SaveStateMetadata) => b.timestamp - a.timestamp));
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

  // ResizeObserver: measures the actual container pixel dimensions and computes
  // the scale that fits the 490×860 Game Boy shell into the available space.
  // Runs on mount and whenever the container is resized (orientation change, etc.).
  useEffect(() => {
    const el = consoleContainerRef.current;
    if (!el) return;
    const compute = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (w === 0 || h === 0) return;
      const scale = Math.min(w / 490, h / 860, 1.15);
      setConsoleScale(scale);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
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

      // ── ASYNC METADATA ENRICHMENT LOOP ──
      // Offload scraping to a non-blocking background queue so the UI doesn't hang.
      (async () => {
        let scrapedCount = 0;
        for (let i = 0; i < foundGames.length; i++) {
          const game = foundGames[i];
          
          // 1. Check if we've already cached this title in IndexedDB permanently
          let meta = await MetadataStorage.getMetadata(game.id);
          
          if (!meta) {
            // 2. Not cached: Hit the Wikipedia transparent API to discover lore
            // We gently rate limit ourselves implicitly due to API roundtrips
            meta = await fetchGameMetadata(game.title);
            
            // 3. Keep it permanently for future app launches
            if (Object.keys(meta).length > 0) {
              await MetadataStorage.saveMetadata(game.id, meta);
              scrapedCount++;
            } else {
              // Cache empty result to avoid re-fetching failed queries endlessly
              await MetadataStorage.saveMetadata(game.id, { _scraped: true });
            }
          }

          // 4. Update the React state gracefully so the Game Library cards update live!
          if (meta && Object.keys(meta).length > 0 && !meta._scraped) {
            setGames(prevList => prevList.map(g => 
              g.id === game.id ? { ...g, ...meta } : g
            ));
          }
        }
        
        if (scrapedCount > 0) {
          addLog(`Scraper finished. Extracted metadata for ${scrapedCount} new titles.`);
        }
      })();

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
    if (userSettings?.hapticFeedbackEnabled && navigator?.vibrate) {
      navigator.vibrate(10); // 10ms short vibration for tactile click
    }
    if (emulatorInstance) {
      emulatorInstance.pressDown(button);
      const canvas = document.querySelector('#emulator-view canvas') as HTMLCanvasElement;
      if (canvas) canvas.focus();
    }
  };

  const simulateKeyUp = (button: string) => {
    if (emulatorInstance) emulatorInstance.pressUp(button);
  };

  const simulateKeyboardEvent = (code: string, isDown: boolean) => {
    const canvas = document.querySelector('#emulator-view canvas') as HTMLCanvasElement;
    if (canvas) {
      canvas.dispatchEvent(new KeyboardEvent(isDown ? 'keydown' : 'keyup', {
        code: code,
        key: code,
        bubbles: true,
        cancelable: true
      }));
      if (isDown) canvas.focus();
    }
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
        setTelemetry((prev: { fps: number; ram: number; vram: number; history: number[] }) => ({
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
  const filteredGames = games.filter((game: GameMetadata) => {
    const matchesSearch = (game.title || game.fileName).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform = platformFilter === 'ALL' || game.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  // --- Dynamic Casing Styles ---
  const getCasingStyles = (casing: typeof currentCasing): React.CSSProperties => {
    if (casing.type === 'solid') {
      return { backgroundColor: casing.solidColor };
    }
    if (casing.type === 'gradient') {
      return { backgroundImage: `linear-gradient(${casing.gradient.direction}, ${casing.gradient.colorFrom}, ${casing.gradient.colorTo})` };
    }
    if (casing.type === 'image') {
      return { backgroundImage: `url(${casing.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#333' };
    }
    return {}; // classic handles by CSS classes
  };

  const getCasingClasses = (casing: typeof currentCasing): string => {
    if (casing.type === 'classic') {
      if (casing.classicId === 'atomic-purple') return 'casing-atomic-purple text-[#ffd0ff]';
      if (casing.classicId === 'clear') return 'casing-clear text-[#333]';
      if (casing.classicId === 'yellow') return 'casing-yellow text-[#555]';
      return 'bg-gradient-to-br from-[#f2f2f0] to-[#cdc9b8]'; // plastic-gray
    }
    return 'text-[#fff] border-white/20'; // Base classes for custom dark colors
  };

  return (
    <div className={`flex flex-col h-[100dvh] w-full bg-[#111] overflow-hidden text-[#333] theme-${userSettings?.colorTheme || 'arcade-neon'} ${userSettings?.crtFilterEnabled ? 'crt-filter' : ''} ${userSettings?.scanlinesEnabled ? 'scanlines' : ''}`}>

      {/* Global CSS Overlays */}
      {userSettings?.crtFilterEnabled && <div className="fixed inset-0 pointer-events-none rounded-[10%] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] z-50"></div>}
      {userSettings?.scanlinesEnabled && <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-50 opacity-20"></div>}

      {/* Casing Color Modal */}
      {isCasingModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in text-[#333]">
          <Card className="w-full max-w-4xl p-6 md:p-8 bg-[#e0ddcf] border-[4px] border-[#b5b2a3] shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_4px_10px_rgba(255,255,255,0.5)] !rounded-xl relative texture-plastic flex flex-col md:flex-row gap-8">
            <button
              onClick={() => setIsCasingModalOpen(false)}
              className="absolute top-4 right-4 text-[#8a1955] hover:text-[#5a000a] bg-black/5 rounded-full p-1 transition-colors z-10"
            >
              <X size={24} />
            </button>

            {/* Left Col: Controls */}
            <div className="flex-1 flex flex-col pt-2 min-w-0">
              <h2 className="text-xl font-black italic text-[#29225c] border-b-4 border-[#c0bdae] pb-2 mb-6 tracking-wider uppercase truncate">Shell Customizer</h2>

              {/* Type Tabs */}
              <div className="flex gap-2 mb-6 bg-[#e0ddcf] rounded">
                {(['classic', 'solid', 'gradient', 'image'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setTempCasing(prev => ({ ...prev, type }))}
                    className={`flex-1 py-3 px-1 text-[8px] sm:text-[10px] font-black uppercase tracking-widest rounded transition-all cursor-pointer ${tempCasing.type === type ? 'bg-[#a61022] text-white border-[3px] border-[#5a000a] shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] translate-y-[2px]' : 'bg-[#e0ddcf] text-[#4a4b52] border-[3px] border-[#b5b2a3] hover:bg-[#b5b2a3] border-b-[5px] active:translate-y-[2px] active:border-b-[3px] shadow-md'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Dynamic Controls based on type */}
              <div className="flex-1 overflow-y-auto mb-4 custom-scrollbar pr-2 min-h-[200px]">

                {tempCasing.type === 'classic' && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'plastic-gray', name: 'Plastic Gray', color: '#f2f2f0' },
                      { id: 'atomic-purple', name: 'Atomic Purple', color: '#64308c' },
                      { id: 'clear', name: 'Clear Glass', color: '#e6e6e6' },
                      { id: 'yellow', name: 'Electric Yellow', color: '#f7d51d' }
                    ].map(style => (
                      <button
                        key={style.id}
                        onClick={() => setTempCasing(prev => ({ ...prev, classicId: style.id as any }))}
                        className={`p-3 rounded border-[3px] flex items-center justify-between transition-all cursor-pointer ${tempCasing.classicId === style.id ? 'bg-[#a8a598] border-[#a61022] shadow-[inset_0_2px_5px_rgba(0,0,0,0.3)] translate-y-[2px]' : 'bg-[#e0ddcf] border-[#b5b2a3] hover:bg-[#b5b2a3] border-b-[5px] shadow-md active:translate-y-[2px] active:border-b-[3px]'}`}
                      >
                        <span className="text-[8px] sm:text-[10px] uppercase font-black tracking-widest text-[#29225c] text-left leading-tight break-words pr-2">{style.name}</span>
                        <div className="w-6 h-6 rounded-sm border-2 border-[#333] shadow-inner shrink-0" style={{ backgroundColor: style.color }}></div>
                      </button>
                    ))}
                  </div>
                )}

                {tempCasing.type === 'solid' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-[#4a4b52] tracking-wider mb-1">Pick Solid Color</label>
                    <div className="flex items-center gap-4 bg-[#b5b2a3] p-4 rounded border-[3px] border-[#8c897d] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                      <input
                        type="color"
                        value={tempCasing.solidColor}
                        onChange={(e) => setTempCasing(prev => ({ ...prev, solidColor: e.target.value }))}
                        className="w-12 h-12 p-0 border-2 border-[#333] cursor-pointer rounded-sm"
                      />
                      <span className="font-mono font-bold text-sm text-[#333]">{tempCasing.solidColor}</span>
                    </div>
                  </div>
                )}

                {tempCasing.type === 'gradient' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-[#4a4b52] tracking-wider mb-1">Gradient Configuration</label>
                    <div className="flex flex-col gap-4 bg-[#b5b2a3] p-4 rounded border-[3px] border-[#8c897d] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col gap-2 relative">
                          <span className="text-[8px] font-black uppercase tracking-wider text-[#4a4b52]">Color 1</span>
                          <input type="color" value={tempCasing.gradient.colorFrom} onChange={(e) => setTempCasing(prev => ({ ...prev, gradient: { ...prev.gradient, colorFrom: e.target.value } }))} className="w-10 h-10 p-0 border-2 border-[#333] cursor-pointer rounded-sm absolute left-[65px] top-1/2 -translate-y-1/2" />
                        </div>
                        <div className="ml-10 flex flex-col gap-2 relative">
                          <span className="text-[8px] font-black uppercase tracking-wider text-[#4a4b52]">Color 2</span>
                          <input type="color" value={tempCasing.gradient.colorTo} onChange={(e) => setTempCasing(prev => ({ ...prev, gradient: { ...prev.gradient, colorTo: e.target.value } }))} className="w-10 h-10 p-0 border-2 border-[#333] cursor-pointer rounded-sm absolute left-[65px] top-1/2 -translate-y-1/2" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 mt-4">
                        <span className="text-[8px] font-black uppercase tracking-wider text-[#4a4b52]">Direction</span>
                        <div className="relative">
                          <select
                            value={tempCasing.gradient.direction}
                            onChange={(e) => setTempCasing(prev => ({ ...prev, gradient: { ...prev.gradient, direction: e.target.value as any } }))}
                            className="bg-[#1a1a1a] border-2 border-[#444] text-[var(--retro-neon)] p-3 rounded-md text-[10px] uppercase font-bold w-full appearance-none pr-8 cursor-pointer shadow-[inset_0_2px_5px_rgba(0,0,0,0.8)] focus:outline-none"
                          >
                            <option value="to right">Left to Right</option>
                            <option value="to bottom">Top to Bottom</option>
                            <option value="to bottom right">Diagonal (Top-Left to Bottom-Right)</option>
                            <option value="to top right">Diagonal (Bottom-Left to Top-Right)</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]">▼</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {tempCasing.type === 'image' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black uppercase text-[#4a4b52] tracking-wider mb-1">Upload Cover Image</label>
                    <div className="flex flex-col items-center justify-center gap-4 bg-[#b5b2a3] p-8 rounded border-[3px] border-dashed border-[#8c897d] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                      <label className="cursor-pointer bg-[#a61022] text-white border-[3px] border-[#5a000a] px-4 py-3 shadow-[0_4px_8px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.2)] transition-all hover:bg-[#800a16] active:translate-y-[2px] active:shadow-inner text-[10px] sm:text-xs font-black uppercase tracking-widest text-center rounded">
                        Select File...
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => setTempCasing(prev => ({ ...prev, imageUrl: e.target?.result as string }));
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {tempCasing.imageUrl ? (
                        <p className="text-[9px] text-[#29225c] font-black uppercase tracking-widest mt-2 bg-[#e0ddcf] px-2 py-1 rounded shadow-sm">Cover Loaded</p>
                      ) : (
                        <p className="text-[9px] text-[#4a4b52] font-black uppercase tracking-widest mt-2">No file selected</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-4 pt-4 border-t-4 border-[#c0bdae] shrink-0">
                <button onClick={() => setIsCasingModalOpen(false)} className="flex-1 py-3 bg-[#e0ddcf] border-[3px] border-[#b5b2a3] text-[#4a4b52] shadow-md hover:bg-[#c0bdae] active:translate-y-[2px] active:border-b-[3px] rounded text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">Cancel</button>
                <button onClick={() => { updateSettings({ casingTheme: tempCasing }); setIsCasingModalOpen(false); }} className="flex-1 py-3 bg-[#1a1a1a] text-[var(--retro-neon)] border-[3px] border-[#333] shadow-[0_4px_8px_rgba(0,0,0,0.5)] hover:bg-[#222] active:translate-y-[2px] active:shadow-inner rounded text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">Save Mod</button>
              </div>
            </div>

            {/* Right Col: Live Preview */}
            <div className="w-full md:w-[220px] shrink-0 border-t-4 md:border-t-0 md:border-l-4 border-[#c0bdae] pt-6 md:pt-0 md:pl-8 flex flex-col items-center justify-center">
              <h3 className="text-[10px] font-black text-[#8c897d] uppercase tracking-widest mb-6 min-w-max">Live Preview</h3>
              {/* Mini Game Boy Shell */}
              <div
                className={`w-[150px] h-[264px] rounded-tl-md rounded-tr-md rounded-bl-xl rounded-br-[3rem] shadow-2xl border-b-[5px] border-r-[4px] border-black/20 flex flex-col items-center pt-2 px-2 relative texture-plastic transition-all duration-500 overflow-hidden ${getCasingClasses(tempCasing)}`}
                style={getCasingStyles(tempCasing)}
              >
                {/* Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiAvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiAvPjwvc3ZnPg==')] mix-blend-multiply z-0"></div>

                {/* Hardware Area */}
                <div className="absolute top-0 left-0 w-full z-10 flex flex-col items-center">
                  <div className="w-full h-1 border-b-[0.5px] border-[#b5b3a6] opacity-50"></div>
                  
                  {/* Mini Rewind/FF Module */}
                  <div className="w-full flex justify-end pr-3 mt-1.5 grayscale contrast-200 opacity-60">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-full bg-black/30 shadow-inner">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#111]"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-[#111]"></div>
                    </div>
                  </div>
                </div>

                {/* Mini Bezel */}
                <div className="w-[95%] h-[128px] bg-[#5c5d66] rounded-t-sm rounded-b-[1.8rem] p-1.5 flex flex-col items-center relative shadow-[inset_0_4px_8px_rgba(0,0,0,0.6)] z-10 border-b-[2px] border-r border-[#333] mt-5 shrink-0">
                  {/* Bezel Labels */}
                  <div className="w-[94%] flex flex-col items-center mb-1 gap-1 px-1 mt-0.5">
                    <div className="w-full flex items-center justify-center gap-1">
                      <div className="flex-1 h-[0.5px] bg-[#751125]"></div>
                      <span className="text-[2.5px] font-black tracking-[0.2em] text-[#b8b8b8] uppercase">RETROVAULT • HIGH FIDELITY</span>
                      <div className="flex-1 h-[0.5px] bg-[#751125]"></div>
                    </div>
                    <div className="w-full flex items-center justify-center gap-1 opacity-60">
                      <div className="flex-1 h-[0.5px] bg-[#161c5c]"></div>
                      <div className="w-[20px] h-0"></div>
                      <div className="flex-1 h-[0.5px] bg-[#161c5c]"></div>
                    </div>
                  </div>

                  {/* Scaled Screen Content */}
                  <div className="w-[85%] h-[88px] bg-[#8bac0f] border-[1.5px] border-[#111] shadow-inner relative overflow-hidden ring-[0.5px] ring-[#555] rounded-[0.5px] mt-0.5">
                    <div className="absolute inset-0 opacity-[0.1] bg-[linear-gradient(rgba(0,0,0,0.5)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(0,0,0,0.5)_1.5px,transparent_1.5px)] bg-[size:1.5px_1.5px]"></div>
                  </div>
                </div>

                {/* Shell Logo */}
                <div className="w-full flex justify-start pl-4 mt-2 mb-0.5 z-10 opacity-90 drop-shadow-[0_0.5px_0.5px_rgba(255,255,255,0.3)]">
                  <span className={`font-sans font-bold text-[5px] tracking-tight ${tempCasing.type === 'classic' && tempCasing.classicId === 'plastic-gray' ? 'text-[#2b2270]' : 'text-current grayscale contrast-200'}`}>Nintendo <span className="italic font-black text-[7px] font-serif">GAME BOY</span><span className="text-[2px] align-top">TM</span></span>
                </div>

                {/* Controls Container */}
                <div className="w-full flex-1 relative mt-1 z-10 select-none px-2">
                  {/* Mini D-Pad */}
                  <div className="absolute top-0.5 left-0.5 w-10 h-10 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full shadow-inner ${tempCasing.type === 'classic' && tempCasing.classicId === 'plastic-gray' ? 'bg-[#c8c6ba]' : 'bg-black/15'}`}></div>
                    <div className="w-9 h-2.5 bg-[#1c1c1c] absolute rounded-sm shadow-md z-10"></div>
                    <div className="w-2.5 h-9 bg-[#1c1c1c] absolute rounded-sm shadow-md z-10"></div>
                  </div>

                  {/* Mini A/B Buttons */}
                  <div className="absolute top-1.5 right-0.5 w-[50px] h-[25px]">
                    <div className={`absolute inset-0 rounded-full transform -rotate-[25deg] shadow-inner ${tempCasing.type === 'classic' && tempCasing.classicId === 'plastic-gray' ? 'bg-[#c2c0b4]' : 'bg-black/15'}`}></div>
                    <div className="absolute inset-0 flex justify-between items-center px-1 transform -rotate-[25deg]">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#d61e6d] to-[#750737] shadow-md border-b-[1.5px] border-[#4a0221]"></div>
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-[#d61e6d] to-[#750737] shadow-md border-b-[1.5px] border-[#4a0221]"></div>
                    </div>
                  </div>

                  {/* Mini Select/Start */}
                  <div className="absolute bottom-4 left-4 flex gap-3 transform -rotate-[22deg] opacity-70">
                    <div className="w-4 h-1 bg-[#4a4d52] rounded-full shadow-sm"></div>
                    <div className="w-4 h-1 bg-[#4a4d52] rounded-full shadow-sm"></div>
                  </div>

                  {/* Mini Speaker Grille */}
                  <div className="absolute bottom-4 right-3 flex gap-0.5 transform -rotate-[22deg] opacity-60">
                    <div className={`w-0.5 h-6 rounded-full shadow-inner ${tempCasing.type === 'classic' && tempCasing.classicId === 'plastic-gray' ? 'bg-[#a8a699]' : 'bg-black/30'}`}></div>
                    <div className={`w-0.5 h-6 rounded-full shadow-inner ${tempCasing.type === 'classic' && tempCasing.classicId === 'plastic-gray' ? 'bg-[#a8a699]' : 'bg-black/30'}`}></div>
                    <div className={`w-0.5 h-6 rounded-full shadow-inner ${tempCasing.type === 'classic' && tempCasing.classicId === 'plastic-gray' ? 'bg-[#a8a699]' : 'bg-black/30'}`}></div>
                    <div className={`w-0.5 h-6 rounded-full shadow-inner ${tempCasing.type === 'classic' && tempCasing.classicId === 'plastic-gray' ? 'bg-[#a8a699]' : 'bg-black/30'}`}></div>
                    <div className={`w-0.5 h-6 rounded-full shadow-inner ${tempCasing.type === 'classic' && tempCasing.classicId === 'plastic-gray' ? 'bg-[#a8a699]' : 'bg-black/30'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}



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
                {(['up', 'down', 'left', 'right', 'a', 'b', 'start', 'select', 'rewind', 'fastForward', 'fullScreen'] as const).map(keyAction => (
                  <div key={keyAction} className="flex justify-between items-center bg-[#b5b2a3] p-2 rounded-md shadow-inner border border-[#8c897d]">
                    <span className="uppercase tracking-widest text-[#4a4b52]">{keyAction}</span>
                    <button
                      onClick={() => setListeningKey(keyAction)}
                      className={`min-w-[50px] px-3 py-1 rounded shadow-md border-b-2 active:border-b-0 active:translate-y-[2px] transition-all uppercase ${listeningKey === keyAction ? 'bg-[#39ff14] text-black border-[#228800] ring-2 ring-[#39ff14]/50' : 'bg-[#1a1a1a] text-[#39ff14] border-black'}`}
                    >
                      {listeningKey === keyAction ? '___' : userSettings?.keyBindings?.[keyAction] || DEFAULT_SETTINGS.keyBindings[keyAction] || '...'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => { setIsKeyBindingModalOpen(false); setListeningKey(null); }} 
                className="w-full py-3 bg-[#1a1a1a] text-[var(--retro-neon)] border-[3px] border-[var(--retro-neon)] shadow-[4px_4px_0_rgba(0,0,0,0.8)] active:translate-y-1 active:shadow-none hover:bg-[var(--retro-neon)] hover:text-black font-black uppercase tracking-widest transition-all rounded"
              >
                DONE
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Main Layout Container */}
      <main className="flex flex-1 w-full max-w-[1500px] mx-auto overflow-hidden p-0 lg:p-6 gap-6 relative">

        {/* LEFT COLUMN — hidden on mobile, shown on desktop */}
        <aside className="hidden lg:flex flex-col w-full lg:w-[340px] shrink-0 gap-4 h-full">

          {/* Game Library: Flexes to fill available space */}
          <Card className="flex flex-col flex-1 min-h-0 p-4 !rounded-xl !border-[0] shadow-xl bg-[#e0ddcf]">
            <div className="flex justify-between items-center px-1 mb-4">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <Library size={16} /> Library
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
                    <div
                      key={game.id}
                      title={game.description ? `${game.title}\n\n${game.description}` : game.title}
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
                      className={`relative w-[130px] h-[145px] shrink-0 bg-[#b5b5b5] rounded-t-xl rounded-b-sm border-2 border-[#8c8c8c] border-b-[6px] shadow-[0_8px_15px_rgba(0,0,0,0.3),inset_0_4px_6px_rgba(255,255,255,0.6),inset_-2px_-4px_6px_rgba(0,0,0,0.3)] cursor-pointer hover:shadow-[0_15px_25px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col pt-2 px-2 pb-3 texture-plastic group ${activeGame?.metadata.id === game.id ? 'shadow-[0_15px_25px_rgba(0,0,0,0.5)] border-[#a61022] ring-2 ring-[#a61022]' : ''}`}
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
                              onError={(e: SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
                            />
                          )}

                          {/* Authentic Title Footer */}
                          <div className="absolute bottom-0 left-0 right-0 bg-white/95 px-2 flex justify-between items-center z-20 border-t-2 border-[#a61022] shadow-[0_-2px_5px_rgba(0,0,0,0.3)]">
                            <span className="font-black text-[8px] uppercase tracking-widest text-[#222] truncate">{game.platform} GAME PAK</span>
                            <span className="font-black text-[6px] text-[#a61022] border border-[#a61022] px-0.5 rounded-sm tabular-nums tracking-widest">{game.releaseYear || 'SYS'}</span>
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
                systemLogs.map((log: { time: Date; message: string }, i: number) => (
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
                saveStates.map((save: SaveStateMetadata) => (
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

        {/* Center Column — ref measured by ResizeObserver to compute exact Game Boy scale */}
        <div
          ref={consoleContainerRef}
          className="flex flex-1 items-center justify-center min-w-0 h-full max-h-[calc(100dvh-60px)] lg:max-h-none overflow-hidden relative"
        >

          {/* Game Boy shell — JS-computed scale keeps all buttons accessible on any screen size */}
          <div
            className={`w-[490px] h-[860px] shrink-0 rounded-tl-xl rounded-tr-xl rounded-bl-2xl rounded-br-[7rem] pt-8 pb-8 px-6 flex flex-col items-center shadow-[30px_40px_60px_rgba(0,0,0,0.6),inset_-5px_-5px_20px_rgba(0,0,0,0.1),inset_5px_5px_15px_rgba(255,255,255,0.9)] border-r-8 border-b-[12px] border-[#a3a193] relative origin-center z-10 texture-plastic overflow-hidden ${getCasingClasses(currentCasing)}`}
            style={{
              ...getCasingStyles(currentCasing),
              transform: `scale(${consoleScale})`,
              marginBlock: `${(consoleScale - 1) * 430}px`,
              marginInline: `${(consoleScale - 1) * 245}px`,
            }}
          >
            {/* Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiAvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiAvPjwvc3ZnPg==')] mix-blend-multiply z-0"></div>

            {/* Top Area Hardware Details */}
            <div className="absolute top-0 left-0 w-full z-10">
              <div className="w-full h-2 border-b-2 border-t-2 border-[#b5b3a6] shadow-[0_1px_1px_rgba(255,255,255,0.8)] opacity-70"></div>
              <div className="absolute top-0 left-[70px] w-[90px] h-[16px] bg-[#a8a699] rounded-b-md shadow-[inset_0_2px_5px_rgba(0,0,0,0.4),0_1px_1px_rgba(255,255,255,0.8)] flex justify-center pb-1 items-end">
                <div className="w-14 h-2.5 bg-[#6b6a62] rounded-b-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex justify-evenly items-center px-1">
                  <div className="w-[1.5px] h-2 bg-[#333]"></div>
                  <div className="w-[1.5px] h-2 bg-[#333]"></div>
                  <div className="w-[1.5px] h-2 bg-[#333]"></div>
                  <div className="w-[1.5px] h-2 bg-[#333]"></div>
                </div>
              </div>

              {/* Hardware Rewind/FF Module */}
              {activeGame && (
                <div className="absolute top-[16px] right-12 z-20">
                  {/* Recessed Pill Channel */}
                  <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full shadow-[inset_2px_3px_5px_rgba(0,0,0,0.4),0_1px_-1px_rgba(255,255,255,0.3)] border border-black/10 transition-all duration-500 ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'bg-[#b6b4a7]' : 'bg-black/30 backdrop-blur-[2px]'}`}>
                    
                    {/* Rewind Button */}
                    <button
                      onPointerDown={() => simulateKeyboardEvent('Backspace', true)}
                      onPointerUp={() => simulateKeyboardEvent('Backspace', false)}
                      onPointerOut={() => simulateKeyboardEvent('Backspace', false)}
                      className="group relative w-7 h-7 flex items-center justify-center"
                    >
                      <div className="absolute inset-0 bg-[#2a2a2a] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.1)] border-b-2 border-black group-active:translate-y-[1px] group-active:shadow-none transition-all cursor-pointer overflow-hidden">
                        {/* Material Texture */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]"></div>
                      </div>
                      <div className="relative z-10 flex gap-[1px] opacity-40 group-hover:opacity-60 transition-opacity">
                        <div className="w-1 h-2 border-r-[1.5px] border-t-[1.5px] border-white rotate-[225deg]"></div>
                        <div className="w-1 h-2 border-r-[1.5px] border-t-[1.5px] border-white rotate-[225deg]"></div>
                      </div>
                    </button>

                    {/* Fast Forward Button */}
                    <button
                      onPointerDown={() => simulateKeyboardEvent('Space', true)}
                      onPointerUp={() => simulateKeyboardEvent('Space', false)}
                      onPointerOut={() => simulateKeyboardEvent('Space', false)}
                      className="group relative w-7 h-7 flex items-center justify-center"
                    >
                      <div className="absolute inset-0 bg-[#2a2a2a] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.1)] border-b-2 border-black group-active:translate-y-[1px] group-active:shadow-none transition-all cursor-pointer overflow-hidden">
                        {/* Material Texture */}
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]"></div>
                      </div>
                      <div className="relative z-10 flex gap-[1px] opacity-40 group-hover:opacity-60 transition-opacity">
                        <div className="w-1 h-2 border-r-[1.5px] border-t-[1.5px] border-white rotate-[45deg]"></div>
                        <div className="w-1 h-2 border-r-[1.5px] border-t-[1.5px] border-white rotate-[45deg]"></div>
                      </div>
                    </button>
                    
                  </div>
                </div>
              )}
            </div>

            {/* Exact DMG Screen Bezel */}
            <div className="w-[95%] h-[420px] bg-gradient-to-b from-[#5c5d66] to-[#45464d] rounded-t-xl rounded-b-[4.5rem] p-6 shadow-[inset_0_8px_20px_rgba(0,0,0,0.6),0_2px_2px_rgba(255,255,255,0.6)] border-b-[3px] border-r-[2px] border-[#333] relative z-10 mt-8 shrink-0">
              
              {/* Bezel Decorative Lines & Text */}
              <div className="w-[95%] mx-auto flex flex-col items-center mb-6 relative top-1 gap-2">
                <div className="w-full flex items-center justify-center gap-3">
                  <div className="flex-1 h-[3px] bg-[#751125] shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"></div>
                  <span className="text-[7.5px] text-[#b8b8b8] font-black tracking-[0.25em] z-10 px-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] uppercase whitespace-nowrap">RETROVAULT • HIGH FIDELITY</span>
                  <div className="flex-1 h-[3px] bg-[#751125] shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"></div>
                </div>
                <div className="w-full flex items-center justify-center gap-3 opacity-80">
                  <div className="flex-1 h-[3px] bg-[#161c5c] shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"></div>
                  <div className="w-[160px] h-0"></div> {/* Match text width roughly */}
                  <div className="flex-1 h-[3px] bg-[#161c5c] shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"></div>
                </div>
              </div>

              {/* Actual Screen Content */}
              <div id="emulator-view" className="mx-auto mt-1 w-[320px] h-[300px] bg-[#8bac0f] border-[6px] border-[#111] shadow-[inset_0_0_20px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.2)] relative overflow-hidden ring-1 ring-[#555] rounded-sm">
                <div className="absolute inset-0 opacity-[0.15] bg-[linear-gradient(rgba(0,0,0,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.5)_1px,transparent_1px)] bg-[size:3px_3px] pointer-events-none z-10"></div>
                <div className="absolute inset-0 shadow-[inset_5px_5px_15px_rgba(0,0,0,0.3)] pointer-events-none z-20"></div>
                <div className="absolute -top-16 -left-16 w-[200%] h-[200%] bg-gradient-to-br from-white/10 to-transparent rotate-45 transform pointer-events-none z-30"></div>
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
            <div className="w-full pl-10 mt-6 flex items-baseline gap-2 z-10 relative opacity-90 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
              <span className={`font-bold text-lg tracking-widest ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'text-[#2b2270]' : 'text-current grayscale contrast-200'}`}>Nintendo</span>
              <span className={`font-black italic text-2xl font-serif ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'text-[#2b2270]' : 'text-current grayscale contrast-200'}`}>GAME BOY</span>
              <span className={`font-bold text-[8px] -ml-1 align-top mt-2 ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'text-[#2b2270]' : 'text-current grayscale contrast-200'}`}>TM</span>
            </div>

            {/* Console Bottom Area (Controls & Speakers) */}
            <div className="w-full flex-1 flex flex-col relative px-8 mt-4">

              {/* Row 1: D-Pad and Action Buttons */}
              <div className="flex justify-between items-center w-full mt-4">

                {/* Exact DMG D-PAD */}
                <div className="relative w-36 h-36 flex items-center justify-center select-none">
                  {/* D-Pad Base Circle Recess */}
                  <div className={`absolute w-36 h-36 rounded-full shadow-[inset_2px_2px_8px_rgba(0,0,0,0.25),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] filter blur-[0.5px] ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'bg-gradient-to-br from-[#c8c6ba] to-[#dedcd1]' : 'bg-black/15'}`}></div>
                  
                  <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                    {/* Vertical Arm */}
                    <div className="absolute w-[42px] h-[125px] bg-[#1c1c1c] rounded-md shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_1px_2px_2px_rgba(255,255,255,0.15),inset_-1px_-2px_2px_rgba(0,0,0,0.8)] border-b-[5px] border-r border-[#0a0a0a] flex flex-col justify-between py-3 items-center z-10">
                      <div className="w-[24px] flex flex-col gap-1.5 opacity-20"><div className="h-0.5 bg-white rounded-full"></div><div className="h-0.5 bg-white rounded-full"></div><div className="h-0.5 bg-white rounded-full"></div></div>
                      <div className="w-[24px] flex flex-col gap-1.5 opacity-20"><div className="h-0.5 bg-white rounded-full"></div><div className="h-0.5 bg-white rounded-full"></div><div className="h-0.5 bg-white rounded-full"></div></div>
                    </div>
                    {/* Horizontal Arm */}
                    <div className="absolute w-[125px] h-[42px] bg-[#1c1c1c] rounded-md shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_1px_2px_2px_rgba(255,255,255,0.15),inset_-1px_-2px_2px_rgba(0,0,0,0.8)] border-b-[5px] border-r border-[#0a0a0a] flex justify-between px-3 items-center z-10">
                       <div className="h-[24px] flex gap-1.5 opacity-20"><div className="w-0.5 bg-white rounded-full"></div><div className="w-0.5 bg-white rounded-full"></div><div className="w-0.5 bg-white rounded-full"></div></div>
                       <div className="h-[24px] flex gap-1.5 opacity-20"><div className="w-0.5 bg-white rounded-full"></div><div className="w-0.5 bg-white rounded-full"></div><div className="w-0.5 bg-white rounded-full"></div></div>
                    </div>
                    {/* Center Indent */}
                    <div className="absolute w-[28px] h-[28px] bg-gradient-to-br from-[#111] to-[#222] rounded-full shadow-[inset_1px_1px_4px_rgba(0,0,0,0.9)] z-20"></div>

                    {/* Invisible Hit Zones */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[42px] h-[55px] z-30 cursor-pointer" onPointerDown={() => simulateKeyDown('up')} onPointerUp={() => simulateKeyUp('up')} onPointerOut={() => simulateKeyUp('up')} />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[42px] h-[55px] z-30 cursor-pointer" onPointerDown={() => simulateKeyDown('down')} onPointerUp={() => simulateKeyUp('down')} onPointerOut={() => simulateKeyUp('down')} />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[42px] w-[55px] z-30 cursor-pointer" onPointerDown={() => simulateKeyDown('left')} onPointerUp={() => simulateKeyUp('left')} onPointerOut={() => simulateKeyUp('left')} />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[42px] w-[55px] z-30 cursor-pointer" onPointerDown={() => simulateKeyDown('right')} onPointerUp={() => simulateKeyUp('right')} onPointerOut={() => simulateKeyUp('right')} />
                  </div>
                </div>

                {/* Exact A / B Buttons */}
                <div className="relative w-[155px] h-[75px] mr-2">
                  {/* Indentation Pill background */}
                  <div className={`absolute inset-0 rounded-[3rem] shadow-[inset_1px_2px_5px_rgba(0,0,0,0.25),inset_-1px_-1px_3px_rgba(255,255,255,0.9)] transform -rotate-[25deg] scale-105 ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'bg-gradient-to-br from-[#c2c0b4] to-[#dedcd1]' : 'bg-black/15'}`}></div>

                  <div className="absolute inset-0 flex justify-between items-center px-[4px] transform -rotate-[25deg] z-10 transition-all">
                    {/* B Button */}
                    <div className="flex flex-col items-center relative group select-none">
                      <div
                        className="w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#d61e6d] to-[#750737] shadow-[0_5px_8px_rgba(0,0,0,0.5),inset_2px_3px_5px_rgba(255,150,180,0.5),inset_-2px_-4px_6px_rgba(0,0,0,0.6)] border-b-[5px] border-r-[2px] border-[#4a0221] group-active:border-b-0 group-active:border-r-0 group-active:translate-y-[5px] group-active:translate-x-[2px] transition-all cursor-pointer"
                        onPointerDown={() => simulateKeyDown('b')}
                        onPointerUp={() => simulateKeyUp('b')}
                        onPointerOut={() => simulateKeyUp('b')}
                      ></div>
                      <span className="text-[#2b2270] font-bold tracking-widest mt-1 text-[13px] absolute -bottom-8 -right-1 opacity-90 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] pointer-events-none">B</span>
                    </div>

                    {/* A Button */}
                    <div className="flex flex-col items-center relative group select-none">
                      <div
                        className="w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#d61e6d] to-[#750737] shadow-[0_5px_8px_rgba(0,0,0,0.5),inset_2px_3px_5px_rgba(255,150,180,0.5),inset_-2px_-4px_6px_rgba(0,0,0,0.6)] border-b-[5px] border-r-[2px] border-[#4a0221] group-active:border-b-0 group-active:border-r-0 group-active:translate-y-[5px] group-active:translate-x-[2px] transition-all cursor-pointer"
                        onPointerDown={() => simulateKeyDown('a')}
                        onPointerUp={() => simulateKeyUp('a')}
                        onPointerOut={() => simulateKeyUp('a')}
                      ></div>
                      <span className="text-[#2b2270] font-bold tracking-widest mt-1 text-[13px] absolute -bottom-8 -right-1 opacity-90 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] pointer-events-none">A</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Select/Start and Speaker Grill */}
              <div className="w-full flex justify-between items-end mt-auto pb-10">

                {/* Select / Start Rubber Pills */}
                <div className="flex gap-10 transform -rotate-[22deg] mb-12 ml-4">
                  {/* Select */}
                  <div className="flex flex-col items-center gap-1 group pb-2">
                    <div
                      className="w-[55px] h-[18px] bg-[#9ca0a6] rounded-full shadow-[inset_1px_2px_3px_rgba(255,255,255,0.3),inset_-1px_-2px_3px_rgba(0,0,0,0.4),0_3px_4px_rgba(0,0,0,0.4)] border-b-[3px] border-[#555] active:border-b-0 active:translate-y-[3px] transition-all cursor-pointer"
                      onPointerDown={() => simulateKeyDown('select')}
                      onPointerUp={() => simulateKeyUp('select')}
                      onPointerOut={() => simulateKeyUp('select')}
                    ></div>
                    <span className="text-[#2b2270] font-bold text-[10px] tracking-[0.2em] mt-1 opacity-90 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] pointer-events-none">SELECT</span>
                  </div>

                  {/* Start */}
                  <div className="flex flex-col items-center gap-1 group pb-2">
                    <div
                      className="w-[55px] h-[18px] bg-[#9ca0a6] rounded-full shadow-[inset_1px_2px_3px_rgba(255,255,255,0.3),inset_-1px_-2px_3px_rgba(0,0,0,0.4),0_3px_4px_rgba(0,0,0,0.4)] border-b-[3px] border-[#555] active:border-b-0 active:translate-y-[3px] transition-all cursor-pointer"
                      onPointerDown={() => simulateKeyDown('start')}
                      onPointerUp={() => simulateKeyUp('start')}
                      onPointerOut={() => simulateKeyUp('start')}
                    ></div>
                    <span className="text-[#2b2270] font-bold text-[10px] tracking-[0.2em] mt-1 opacity-90 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] pointer-events-none">START</span>
                  </div>
                </div>

                {/* Speaker Grill */}
                <div className="flex gap-2.5 transform -rotate-[22deg] mb-8 mr-2 opacity-90">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className={`w-2.5 h-[80px] rounded-full shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5),1px_1px_1px_rgba(255,255,255,0.7)] ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'bg-[#a8a699]' : 'bg-black/15'}`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Phones Jack */}
              <div className="absolute bottom-2 left-0 w-full flex justify-center items-center text-[#888] text-[9px] gap-1 font-bold font-sans drop-shadow-[0_1px_0_rgba(255,255,255,0.6)] opacity-70">
                <div className="w-3 h-3 border-[1.5px] border-[#888] rounded-full border-b-0 rounded-b-none mb-0.5"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry Dashboard — hidden on mobile, shown on desktop */}
        <aside className="hidden lg:flex flex-col w-full lg:w-[320px] shrink-0 gap-4 h-full">
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
                  <span className="text-[var(--retro-neon)] bg-[#1a1a1a] px-2 py-0.5 rounded shadow-inner font-mono">{Math.round((userSettings?.volume ?? 1) * 100)}%</span>
                </div>
                <div className="px-3 py-2 bg-[#b5b2a3] rounded-lg shadow-[inset_0_3px_6px_rgba(0,0,0,0.25)] border border-[#8c897d]">
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={userSettings?.volume ?? 1}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ volume: parseFloat(e.target.value) })}
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
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => updateSettings({ colorTheme: e.target.value as UserSettings['colorTheme'] })}
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

              {/* Shell Customization */}
              <div className="flex flex-col gap-2 pb-2">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">SHELL.MOD</span>
                <button
                  type="button"
                  onClick={() => setIsCasingModalOpen(true)}
                  className="w-full bg-[#a61022] text-[#fff] hover:bg-[#800a16] border-[3px] border-[#5a000a] p-2 rounded shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.2)] transition-all cursor-pointer text-center tracking-widest uppercase font-black text-[10px]"
                >
                  Customize Casing
                </button>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between bg-[#b5b2a3] p-2.5 rounded-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-[#8c897d]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">DISPLAY.CRT</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.crtFilterEnabled || false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings({ crtFilterEnabled: e.target.checked })} />
                  {/* Heavy Mechanical Toggle Base */}
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-t-0 after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-x-0 bottom-[-4px] h-[4px] bg-[#ff0000] z-0 peer-checked:opacity-100 opacity-0 transition-opacity"></div>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-between bg-[#b5b2a3] p-2.5 rounded-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-[#8c897d] mt-[-4px]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">DISPLAY.SCL</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.scanlinesEnabled || false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings({ scanlinesEnabled: e.target.checked })} />
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-t-0 after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-x-0 bottom-[-4px] h-[4px] bg-[#ff0000] z-0 peer-checked:opacity-100 opacity-0 transition-opacity"></div>
                  </div>
                </label>
              </div>

              {/* Haptic Toggle */}
              <div className="flex items-center justify-between bg-[#b5b2a3] p-2.5 rounded-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] border border-[#8c897d] mt-[-4px]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider flex items-center gap-1">HAPTIC.FB</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.hapticFeedbackEnabled || false} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings({ hapticFeedbackEnabled: e.target.checked })} />
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 peer-checked:after:border-white after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-t-0 after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]">
                    <div className="absolute inset-x-0 bottom-[-4px] h-[4px] bg-[#ff0000] z-0 peer-checked:opacity-100 opacity-0 transition-opacity"></div>
                  </div>
                </label>
              </div>

            </div>
          </Card>
        </aside>

      </main>

      {/* ═══════════════════════════════════════════════════════════════
           MOBILE BOTTOM SHEET — All panels in a sleek tabbed drawer
          ═══════════════════════════════════════════════════════════════ */}

      {/* Bottom Tab Bar — icon-only, premium pill-highlight style */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-[#e0ddcf] border-t-[3px] border-[var(--retro-neon)] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] texture-plastic"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: '60px' }}
      >
        {([
          { id: 'library', Icon: Library, label: 'Library' },
          { id: 'saves', Icon: Save, label: 'Saves' },
          { id: 'logs', Icon: ScrollText, label: 'Logs' },
          { id: 'telemetry', Icon: Activity, label: 'Telemetry' },
          { id: 'config', Icon: SlidersHorizontal, label: 'Config' },
        ] as const).map(({ id, Icon, label }) => {
          const isActive = isMobileMenuOpen && mobileTab === id;
          return (
            <button
              key={id}
              aria-label={label}
              onClick={() => { setMobileTab(id); setIsMobileMenuOpen(id === mobileTab ? !isMobileMenuOpen : true); }}
              className="flex-1 flex flex-col items-center justify-center h-full relative group active:scale-95 transition-transform"
            >
              {/* Glowing pill behind active icon */}
              <span className={`absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-[var(--retro-neon)]/15 ring-1 ring-[var(--retro-neon)]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]' : 'bg-transparent'
                }`} />
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={`relative z-10 transition-all duration-200 ${isActive
                  ? 'text-[var(--retro-neon)] drop-shadow-[0_0_8px_var(--retro-neon)]'
                  : 'text-[#8c897d] group-active:text-[#4a4b52]'
                  }`}
              />
              {/* Active dot indicator */}
              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full transition-all duration-200 relative z-10 ${isActive ? 'bg-[var(--retro-neon)] shadow-[0_0_6px_var(--retro-neon)]' : 'bg-transparent'
                }`} />
            </button>
          );
        })}
      </nav>

      {/* Bottom Sheet Panel */}
      <div
        className={`lg:hidden fixed left-0 right-0 bottom-[52px] z-30 bg-[#e0ddcf] rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.6)] border-t-2 border-[#c0bdae] transition-transform duration-300 ease-in-out flex flex-col ${isMobileMenuOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        style={{ maxHeight: '70vh' }}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#aaa]"></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 pt-2">

          {/* ── LIBRARY TAB ── */}
          {mobileTab === 'library' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest">Library</h3>
                <button onClick={handleSelectVault} className="text-[10px] py-1.5 px-4 bg-[#a61022] hover:bg-[#800a16] text-white border-b-4 border-[#5a000a] active:border-b-0 active:translate-y-1 transition-all rounded-full shadow-md font-bold">
                  {dirHandle ? 'CHG VAULT' : '+ ADD ROM'}
                </button>
              </div>

              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="SEARCH VAULT..."
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1a1a1a]/5 border-2 border-[#c0bdae] rounded-xl px-4 py-2 text-[11px] font-bold tracking-widest text-[#4a4b52] placeholder:text-[#8c897d] focus:outline-none focus:border-[#a61022]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c897d]"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {(['ALL', 'GBA', 'GBC', 'GB', 'SNES', 'NES'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setPlatformFilter(p)}
                      className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest whitespace-nowrap transition-all ${platformFilter === p ? 'bg-[#a61022] text-white shadow-lg' : 'bg-[#c0bdae]/30 text-[#4a4b52]'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pb-2">
                {isScanning ? (
                  <div className="col-span-3 flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-[#c0bdae] border-t-[#4a4b52] rounded-full animate-spin"></div>
                  </div>
                ) : games.length === 0 ? (
                  <div className="col-span-3 text-center py-8 opacity-50">
                    <Gamepad2 size={28} className="mx-auto mb-2 text-[#555]" />
                    <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Vault is Empty</p>
                  </div>
                ) : (
                  filteredGames.map((game: GameMetadata) => {
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
                              setEmulatorInstance(null);
                              setIsMobileMenuOpen(false);
                            }
                          } catch (err) { console.error(err); }
                        }}
                        className={`relative w-full aspect-[4/5] bg-[#b5b5b5] rounded-xl border-2 border-[#8c8c8c] border-b-[5px] shadow-lg cursor-pointer flex flex-col overflow-hidden texture-plastic ${activeGame?.metadata.id === game.id ? 'border-[#a61022] ring-2 ring-[#a61022]' : ''
                          }`}
                      >
                        <div className="absolute top-1 right-1 bg-black/80 px-1 py-0.5 rounded z-30 flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${history?.timePlayedSeconds ? 'bg-[#ffb000]' : 'bg-[#39ff14] animate-pulse'}`}></div>
                          <span className="text-[7px] font-black tracking-widest text-[#e0ddcf] uppercase">{history?.timePlayedSeconds ? `${Math.floor(history.timePlayedSeconds / 60)}m` : 'NEW'}</span>
                        </div>
                        {game.boxArtUrl ? (
                          <img src={game.boxArtUrl} alt={game.title} className="w-full h-full object-cover" loading="lazy" onError={(e: SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <div className="flex-1 flex items-center justify-center p-2">
                            <span className="text-[9px] font-black text-[#333] text-center uppercase leading-tight">{game.title}</span>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-white/90 px-1 py-0.5 border-t border-[#a61022] z-20">
                          <span className="text-[7px] font-black uppercase tracking-widest text-black truncate block">{game.platform} GAME PAK</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── SAVES TAB ── */}
          {mobileTab === 'saves' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest">Save States</h3>
                <button
                  onClick={handleCreateSave}
                  disabled={!emulatorInstance || !activeGame}
                  className="text-[10px] py-1.5 px-4 bg-[#1a1a1a] text-[#39ff14] border border-[#333] rounded font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  + SAVE
                </button>
              </div>
              {saveStates.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#555]">No saves found</p>
                  <p className="text-[10px] text-[#555] mt-1">Ensure a game is running first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {saveStates.map((save: SaveStateMetadata) => (
                    <div key={save.id} className="flex justify-between items-center bg-[#f2f2f0] p-3 rounded-lg border border-[#c0bdae] shadow-sm">
                      <div>
                        <p className="text-[11px] font-bold text-[#29225c]">{new Date(save.timestamp).toLocaleDateString()} {new Date(save.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[9px] text-[#888] uppercase font-bold mt-0.5">ID: {save.id.slice(0, 10)}...</p>
                      </div>
                      <button onClick={() => handleLoadState(save.id)} className="text-[10px] bg-[#1a1a1a] px-3 py-1.5 rounded font-black text-[var(--retro-neon)] border-b-2 border-black active:border-b-0">LOAD</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── LOGS TAB ── */}
          {mobileTab === 'logs' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#39ff14] shadow-[0_0_5px_#39ff14] animate-pulse"></div>
                System Logs
              </h3>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border-2 border-[#333] font-mono text-[11px] text-[#00ff00] leading-relaxed space-y-1">
                {systemLogs.length === 0 ? (
                  <span className="opacity-50 italic">Waiting for events...</span>
                ) : (
                  systemLogs.map((log: { time: Date; message: string }, i: number) => (
                    <div key={i} className="break-words">
                      <span className="opacity-50">[{log.time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── TELEMETRY TAB ── */}
          {mobileTab === 'telemetry' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14] animate-pulse"></div>
                Telemetry
              </h3>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border-2 border-[#333] font-mono text-xs text-[#00ff00]">
                {/* FPS Graph */}
                <div className="flex items-end h-16 border-b border-[#333] pb-1 gap-[2px] mb-3">
                  {telemetry.history.map((val: number, i: number) => (
                    <div key={i} className={`flex-1 rounded-t transition-all duration-300 ${val > 45 ? 'bg-[var(--retro-neon)]' : val > 0 ? 'bg-[#ffb000]' : 'bg-[#222]'}`}
                      style={{ height: `${Math.max(5, Math.min(100, (val / 60) * 100))}%` }}
                    />
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-[#888] font-bold">EMULATION FPS:</span><span className={telemetry.fps > 45 ? 'text-[var(--retro-neon)] font-bold' : 'text-[#ffb000] font-bold'}>{activeGame ? telemetry.fps : '--'}</span></div>
                  <div className="flex justify-between"><span className="text-[#888] font-bold">SYS RAM ALLOC:</span><span className="text-[var(--retro-neon)]"> {activeGame ? `${telemetry.ram} MB` : '--'}</span></div>
                  <div className="flex justify-between"><span className="text-[#888] font-bold">VRAM ALLOC:</span><span className="text-[var(--retro-neon)]"> {activeGame ? `${telemetry.vram} MB` : '--'}</span></div>
                  <div className="flex justify-between"><span className="text-[#888] font-bold">TARGET ARCH:</span><span className="text-[var(--retro-neon)]">{activeGame ? (activeGame.metadata.platform === 'GBA' ? 'ARM7TDMI' : activeGame.metadata.platform === 'SNES' ? 'WDC 65C816' : activeGame.metadata.platform === 'NES' ? 'Ricoh 2A03' : 'GENERIC') : 'IDLE'}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* ── CONFIG TAB ── */}
          {mobileTab === 'config' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={16} /> Hardware Config
              </h3>

              {/* Volume */}
              <label className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-black uppercase text-[#4a4b52] tracking-wider">
                  <span>AUDIO.VOL</span>
                  <span className="text-[var(--retro-neon)] bg-[#1a1a1a] px-2 py-0.5 rounded font-mono">{Math.round((userSettings?.volume ?? 1) * 100)}%</span>
                </div>
                <div className="px-3 py-2 bg-[#b5b2a3] rounded-lg shadow-inner border border-[#8c897d]">
                  <input type="range" min="0" max="1" step="0.05"
                    value={userSettings?.volume ?? 1}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ volume: parseFloat(e.target.value) })}
                    className="slider-mechanical w-full block"
                  />
                </div>
              </label>

              {/* Theme */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">LCD.THEME</span>
                <div className="relative">
                  <select
                    value={userSettings?.colorTheme || 'arcade-neon'}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => updateSettings({ colorTheme: e.target.value as UserSettings['colorTheme'] })}
                    className="bg-[#1a1a1a] border-2 border-[#444] text-[var(--retro-neon)] p-2 rounded-md text-xs uppercase font-bold w-full appearance-none pr-8 cursor-pointer"
                  >
                    <option value="arcade-neon">Arcade Neon</option>
                    <option value="gameboy-dmg">Gameboy DMG</option>
                    <option value="virtual-boy">Virtual Boy</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]">▼</div>
                </div>
              </div>

              {/* Key Bindings */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">GAME.CTRL</span>
                <button onClick={() => setIsKeyBindingModalOpen(true)}
                  className="w-full bg-[#1a1a1a] text-[var(--retro-neon)] border-2 border-[#444] p-2.5 rounded-md text-xs uppercase font-bold tracking-widest"
                >Configure Mappings</button>
              </div>

              {/* Shell Customization */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">SHELL.MOD</span>
                <button onClick={() => { setMobileTab('library'); setIsMobileMenuOpen(false); setIsCasingModalOpen(true); }}
                  className="w-full bg-[#a61022] text-white border-[3px] border-[#5a000a] p-2.5 rounded text-xs uppercase font-black tracking-widest shadow"
                >Customize Casing</button>
              </div>

              {/* CRT Toggle */}
              <div className="flex items-center justify-between bg-[#b5b2a3] p-3 rounded-md border border-[#8c897d]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">DISPLAY.CRT</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.crtFilterEnabled || false} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ crtFilterEnabled: e.target.checked })} />
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]"></div>
                </label>
              </div>

              {/* Scanlines Toggle */}
              <div className="flex items-center justify-between bg-[#b5b2a3] p-3 rounded-md border border-[#8c897d]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">DISPLAY.SCL</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.scanlinesEnabled || false} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ scanlinesEnabled: e.target.checked })} />
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]"></div>
                </label>
              </div>

              {/* Haptic Toggle */}
              <div className="flex items-center justify-between bg-[#b5b2a3] p-3 rounded-md border border-[#8c897d]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">HAPTIC.FB</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.hapticFeedbackEnabled || false} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ hapticFeedbackEnabled: e.target.checked })} />
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]"></div>
                </label>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

export default App;
