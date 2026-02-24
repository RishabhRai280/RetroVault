import { useEffect, useRef, useState } from 'react';
import { Nostalgist } from 'nostalgist';
import { Maximize, Minimize, X, Settings2, Save, Download, Image as ImageIcon, Pause, Play as PlayIcon } from 'lucide-react';
import { Button } from '@retrovault/ui';
import { SaveStateStorage, SettingsStorage, type UserSettings } from '@retrovault/db';

/**
 * Props expected by the EmulatorOverlay component.
 */
interface EmulatorOverlayProps {
    gameId: string;
    gameTitle: string;
    romFile: File | null; // The exact binary snapshot file returned by File System Access API
    platform: 'GBA' | 'SNES' | 'NES' | 'UNKNOWN'; // The platform enum to decide which RetroArch core to use
    onClose: () => void; // Callback fired when the user selects the X/close button
    onOpenSettings: () => void; // Connect to global settings modal
}

/**
 * A modal overlay that mounts the Nostalgist.js instance.
 * It takes care of launching the emulator into a canvas, keeping track of fullscreen state,
 * and cleaning up the instance when the modal is closed.
 */
export const EmulatorOverlay = ({ gameId, gameTitle, romFile, platform, onClose, onOpenSettings }: EmulatorOverlayProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [nostalgist, setNostalgist] = useState<Nostalgist | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

    // Initial settings load
    useEffect(() => {
        SettingsStorage.getSettings().then(setUserSettings);
    }, []);

    // Re-fetch settings when coming back from Pause state (which Settings modal triggers)
    useEffect(() => {
        if (!isPaused) {
            SettingsStorage.getSettings().then(setUserSettings);
        }
    }, [isPaused]);

    const showStatus = (msg: string) => {
        setStatusMessage(msg);
        setTimeout(() => setStatusMessage(null), 3000);
    };

    // Effect handling the Nostalgist emulator lifecycle (initialization and cleanup)
    useEffect(() => {
        let instance: Nostalgist | null = null;
        let isMounted = true;

        const initEmulator = async () => {
            if (!romFile || !canvasRef.current) return;

            setIsLoading(true);

            // Determine which RetroArch WebAssembly core to pull down from the cloud based on file extension
            let core = 'mgba'; // Default to GBA
            if (platform === 'SNES') core = 'snes9x';
            else if (platform === 'NES') core = 'fceumm';

            try {
                instance = await Nostalgist.launch({
                    rom: romFile,
                    core,
                    element: canvasRef.current,
                });

                if (isMounted) {
                    setNostalgist(instance);
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Failed to launch emulator:", err);
                setIsLoading(false);
            }
        };

        initEmulator();

        return () => {
            isMounted = false;
            if (instance) {
                instance.exit();
            }
        };
    }, [romFile, platform]);

    // --- Actions ---

    const handleSaveState = async () => {
        if (!nostalgist) return;
        try {
            const { state } = await nostalgist.saveState();
            await SaveStateStorage.saveState(gameId, gameTitle, state);
            showStatus("State Saved!");
        } catch (err) {
            console.error("Failed to save state", err);
            showStatus("Failed to save");
        }
    };

    const handleLoadState = async () => {
        if (!nostalgist) return;
        try {
            const states = await SaveStateStorage.getStatesForGame(gameId);
            if (states.length > 0) {
                const latest = states[states.length - 1];
                const blob = await SaveStateStorage.loadState(latest.id);
                if (blob) {
                    await nostalgist.loadState(blob);
                    showStatus("State Loaded!");
                    return;
                }
            }
            showStatus("No saved states");
        } catch (err) {
            console.error("Failed to load state", err);
            showStatus("Failed to load");
        }
    };

    const handleScreenshot = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `${gameTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_screenshot.png`;
            link.href = dataUrl;
            link.click();
            showStatus("Screenshot Saved");
        }
    };

    const handleTogglePause = () => {
        if (!nostalgist) return;
        if (isPaused) {
            nostalgist.resume();
            setIsPaused(false);
            showStatus("Resumed");
        } else {
            nostalgist.pause();
            setIsPaused(true);
            showStatus("Paused");
        }
    };

    // Request or exit native browser fullscreen on the container element
    const toggleFullscreen = async () => {
        if (!containerRef.current) return;

        if (!document.fullscreenElement) {
            await containerRef.current.requestFullscreen();
            setIsFullscreen(true);
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    if (!romFile) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-fade-in">
            <div
                ref={containerRef}
                className={`relative flex flex-col items-center bg-black border border-white/10 shadow-2xl transition-all duration-300 ${isFullscreen ? 'w-full h-full border-none rounded-none' : 'w-[80vw] max-w-5xl aspect-[4/3] rounded-2xl overflow-hidden'
                    }`}
            >
                {/* Overlay UI (Hidden when mouse is idle in future versions, for now always visible at top) */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10 opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <h2 className="text-white font-bold ml-2 text-shadow drop-shadow-md">
                        {romFile.name}
                    </h2>
                    <div className="flex gap-2 items-center">
                        {statusMessage && (
                            <span className="text-xs text-[var(--retro-neon)] mr-4 animate-fade-in">{statusMessage}</span>
                        )}
                        <Button variant="icon" size="sm" onClick={handleTogglePause} title={isPaused ? "Resume" : "Pause"}>
                            {isPaused ? <PlayIcon size={18} className="text-green-400" /> : <Pause size={18} />}
                        </Button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <Button variant="icon" size="sm" onClick={handleSaveState} title="Save State">
                            <Save size={18} />
                        </Button>
                        <Button variant="icon" size="sm" onClick={handleLoadState} title="Load State">
                            <Download size={18} />
                        </Button>
                        <Button variant="icon" size="sm" onClick={handleScreenshot} title="Screenshot">
                            <ImageIcon size={18} />
                        </Button>
                        <div className="w-px h-5 bg-white/20 mx-1"></div>
                        <Button variant="icon" size="sm" onClick={toggleFullscreen} title="Fullscreen">
                            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </Button>
                        <Button variant="icon" size="sm" title="Settings" onClick={() => {
                            if (!isPaused && nostalgist) handleTogglePause(); // Optionally pause before opening settings
                            onOpenSettings();
                        }}>
                            <Settings2 size={18} />
                        </Button>
                        <Button variant="icon" size="sm" onClick={onClose} className="hover:bg-red-500/20 text-red-500 hover:text-red-400" title="Close">
                            <X size={18} />
                        </Button>
                    </div>
                </div>

                {/* Emulator Canvas Container */}
                <div className="flex-1 w-full h-full flex items-center justify-center bg-black">
                    {isLoading && (
                        <div className="absolute flex flex-col items-center justify-center text-[var(--retro-neon)] space-y-4">
                            <div className="w-12 h-12 border-4 border-[var(--retro-neon-dim)] border-t-[var(--retro-neon)] rounded-full animate-spin"></div>
                            <p className="animate-pulse tracking-widest font-medium">INSERTING CARTRIDGE...</p>
                        </div>
                    )}

                    {/* Visual Filters applied via CSS pseudo-elements or wrapper classes */}
                    <div className={`relative w-full h-full ${userSettings?.crtFilterEnabled ? 'crt-filter text-shadow-glow' : ''} ${userSettings?.scanlinesEnabled ? 'scanlines' : ''}`}>
                        <canvas
                            ref={canvasRef}
                            className="w-full h-full object-contain pixelated"
                            style={{ imageRendering: 'pixelated' }}
                            tabIndex={0}
                        />
                        {/* CSS Overlay for advanced retro effects */}
                        {userSettings?.crtFilterEnabled && <div className="absolute inset-0 pointer-events-none rounded-[10%] shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]"></div>}
                        {userSettings?.scanlinesEnabled && <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px]"></div>}
                    </div>
                </div>
            </div>
        </div>
    );
};
