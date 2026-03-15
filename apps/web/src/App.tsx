import { useState, useEffect, useRef } from 'react';
import { Nostalgist } from 'nostalgist';
import { scanDirectory, fetchGameMetadata } from '@retrovault/core';
import type { GameMetadata } from '@retrovault/core';
import { PlayHistoryStorage, SaveStateStorage, SettingsStorage, MetadataStorage, type UserSettings, type KeyBindings, type PlayHistory, type SaveStateMetadata } from '@retrovault/db';

import { GameBoyShell } from './components/GameBoy/GameBoyShell';
import { CasingModal } from './components/Casing/CasingModal';
import { KeyBindingModal } from './components/KeyBinding/KeyBindingModal';
import { TelemetryDashboard } from './components/Telemetry/TelemetryDashboard';
import { HardwareConfig } from './components/Settings/HardwareConfig';
import { GameLibrary } from './components/Library/GameLibrary';
import { SystemLogs } from './components/Logs/SystemLogs';
import { SaveStatesPanel } from './components/Saves/SaveStatesPanel';
import { MobileBottomSheet } from './components/Navigation/MobileBottomSheet';

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
  
  const [consoleScale, setConsoleScale] = useState(1);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'library' | 'saves' | 'logs' | 'telemetry' | 'config'>('library');
  const [isKeyBindingModalOpen, setIsKeyBindingModalOpen] = useState(false);
  const [listeningKey, setListeningKey] = useState<keyof KeyBindings | null>(null);
  const [playHistory, setPlayHistory] = useState<Record<string, PlayHistory>>({});

  const [isCasingModalOpen, setIsCasingModalOpen] = useState(false);
  const defaultCasingTheme: import('@retrovault/db').CasingTheme = { type: 'classic', classicId: 'plastic-gray', solidColor: '#b5b5b5', gradient: { colorFrom: '#e66465', colorTo: '#9198e5', direction: 'to bottom right' }, imageUrl: '' };
  const currentCasing = userSettings?.casingTheme || defaultCasingTheme;
  const [tempCasing, setTempCasing] = useState(currentCasing);

  const [systemLogs, setSystemLogs] = useState<{ time: Date; message: string }[]>([]);
  const [saveStates, setSaveStates] = useState<SaveStateMetadata[]>([]);

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

  return (
    <div className={`flex flex-col h-[100dvh] w-full bg-[#111] overflow-hidden text-[#333] theme-${userSettings?.colorTheme || 'arcade-neon'} ${userSettings?.crtFilterEnabled ? 'crt-filter' : ''} ${userSettings?.scanlinesEnabled ? 'scanlines' : ''}`}>

      {/* Global CSS Overlays */}
      {userSettings?.crtFilterEnabled && <div className="fixed inset-0 pointer-events-none rounded-[10%] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] z-50"></div>}
      {userSettings?.scanlinesEnabled && <div className="fixed inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] z-50 opacity-20"></div>}

      {/* Casing Color Modal */}
      <CasingModal
        isOpen={isCasingModalOpen}
        onClose={() => setIsCasingModalOpen(false)}
        tempCasing={tempCasing}
        setTempCasing={setTempCasing}
        updateSettings={updateSettings}
      />

      {/* Key Binding Modal */}
      <KeyBindingModal
        isOpen={isKeyBindingModalOpen}
        onClose={() => { setIsKeyBindingModalOpen(false); setListeningKey(null); }}
        listeningKey={listeningKey}
        setListeningKey={setListeningKey}
        userSettings={userSettings}
      />

      {/* Main Layout Container */}
      <main className="flex flex-1 w-full max-w-[1500px] mx-auto overflow-hidden p-0 lg:p-6 gap-6 relative">

        {/* LEFT COLUMN — hidden on mobile, shown on desktop */}
        <aside className="hidden lg:flex flex-col w-full lg:w-[340px] shrink-0 gap-4 h-full min-h-0">
          <GameLibrary
            dirHandle={dirHandle}
            isScanning={isScanning}
            games={games}
            activeGame={activeGame}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            platformFilter={platformFilter}
            setPlatformFilter={setPlatformFilter}
            handleSelectVault={handleSelectVault}
            setActiveGame={setActiveGame}
            setEmulatorInstance={setEmulatorInstance}
            playHistory={playHistory}
            addLog={addLog}
          />
          <SystemLogs systemLogs={systemLogs} />
          <SaveStatesPanel
            saveStates={saveStates}
            handleCreateSave={handleCreateSave}
            handleLoadState={handleLoadState}
            emulatorInstance={emulatorInstance}
            activeGame={activeGame}
          />
        </aside>

        {/* Center Column — ref measured by ResizeObserver to compute exact Game Boy scale */}
        <div
          ref={consoleContainerRef}
          className="flex flex-1 items-center justify-center min-w-0 h-full max-h-[calc(100dvh-60px)] lg:max-h-none overflow-hidden relative"
        >
          <GameBoyShell
            activeGame={activeGame}
            currentCasing={currentCasing}
            consoleScale={consoleScale}
            userSettings={userSettings}
            simulateKeyDown={simulateKeyDown}
            simulateKeyUp={simulateKeyUp}
            simulateKeyboardEvent={simulateKeyboardEvent}
            handleCloseEmulator={handleCloseEmulator}
            setEmulatorInstance={setEmulatorInstance}
            addLog={addLog}
          />
          </div>

        {/* Right Column: Telemetry Dashboard — hidden on mobile, shown on desktop */}
        <aside className="hidden lg:flex flex-col w-full lg:w-[320px] shrink-0 gap-4 h-full">
          <TelemetryDashboard
            telemetry={telemetry}
            activeGame={activeGame}
            handleFullscreen={handleFullscreen}
          />
          <HardwareConfig
            userSettings={userSettings}
            updateSettings={updateSettings}
            setIsKeyBindingModalOpen={setIsKeyBindingModalOpen}
            setIsCasingModalOpen={setIsCasingModalOpen}
          />
        </aside>

      </main>

      <MobileBottomSheet
        isOpen={isMobileMenuOpen}
        setIsOpen={setIsMobileMenuOpen}
        mobileTab={mobileTab}
        setMobileTab={setMobileTab}
        games={games}
        filteredGames={filteredGames}
        isScanning={isScanning}
        dirHandle={dirHandle}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        platformFilter={platformFilter}
        setPlatformFilter={setPlatformFilter}
        playHistory={playHistory}
        activeGame={activeGame}
        setActiveGame={setActiveGame}
        setEmulatorInstance={setEmulatorInstance}
        addLog={addLog}
        handleSelectVault={handleSelectVault}
        saveStates={saveStates}
        handleCreateSave={handleCreateSave}
        handleLoadState={handleLoadState}
        emulatorInstance={emulatorInstance}
        systemLogs={systemLogs}
        telemetry={telemetry}
        userSettings={userSettings}
        updateSettings={updateSettings}
        setIsKeyBindingModalOpen={setIsKeyBindingModalOpen}
        setIsCasingModalOpen={setIsCasingModalOpen}
      />



    </div>
  );
}

export default App;
