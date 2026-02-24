import { useEffect, useRef, useState, useCallback } from 'react';
import { Nostalgist } from 'nostalgist';
import { SettingsStorage, PlayHistoryStorage, SaveStateStorage, type UserSettings, type KeyBindings } from '@retrovault/db';

interface EmulatorOverlayProps {
    gameId: string;
    gameTitle: string;
    romFile: File | null;
    platform: 'GBA' | 'SNES' | 'NES' | 'UNKNOWN';
    volume?: number;
    keyBindings?: KeyBindings;
    onClose: () => void;
    onReady?: (instance: Nostalgist | null) => void;
}

const CORE_MAP: Record<string, string> = {
    GBA: 'mgba',
    SNES: 'snes9x',
    NES: 'fceumm',
};

export const EmulatorConsole = ({
    gameId,
    romFile,
    platform,
    volume = 1,
    keyBindings,
    onReady,
}: EmulatorOverlayProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nostalgistRef = useRef<Nostalgist | null>(null);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

    /* -----------------------------
       Load User Settings (Once)
    ------------------------------ */
    useEffect(() => {
        let active = true;

        SettingsStorage.getSettings().then(settings => {
            if (active) setUserSettings(settings);
        });

        return () => {
            active = false;
        };
    }, []);

    /* -----------------------------
       Core Resolver
    ------------------------------ */
    const resolveCore = useCallback(() => {
        return CORE_MAP[platform] ?? 'mgba';
    }, [platform]);

    /* -----------------------------
       Emulator Initialization
    ------------------------------ */
    useEffect(() => {
        if (!romFile || !canvasRef.current) return;

        let mounted = true;
        let instance: Nostalgist | null = null;

        const launch = async () => {
            try {
                setIsLoading(true);

                const volumeDB = volume > 0 ? Math.log10(Math.max(0.01, volume)) * 20 : -60;

                instance = await Nostalgist.launch({
                    rom: romFile,
                    core: resolveCore(),
                    element: canvasRef.current!,
                    retroarchConfig: {
                        audio_volume: volumeDB,
                        ...(keyBindings ? {
                            input_player1_up: keyBindings.up,
                            input_player1_down: keyBindings.down,
                            input_player1_left: keyBindings.left,
                            input_player1_right: keyBindings.right,
                            input_player1_a: keyBindings.a,
                            input_player1_b: keyBindings.b,
                            input_player1_start: keyBindings.start,
                            input_player1_select: keyBindings.select,
                        } : {})
                    }
                });

                if (!mounted) {
                    instance.exit();
                    return;
                }

                nostalgistRef.current = instance;
                onReady?.(instance);

                // Attempt to load auto-save
                try {
                    const autoSaveBlob = await SaveStateStorage.loadAutoState(gameId);
                    if (autoSaveBlob) {
                        await instance.loadState(autoSaveBlob);
                    }
                } catch (e) {
                    console.warn("No auto-save found or failed to load:", e);
                }

                // Auto focus for keyboard controls
                canvasRef.current?.focus();

                setIsLoading(false);
            } catch (err) {
                console.error('Emulator launch failed:', err);
                setIsLoading(false);
            }
        };

        launch();

        return () => {
            mounted = false;

            if (nostalgistRef.current) {
                nostalgistRef.current.exit();
                nostalgistRef.current = null;
            }
            onReady?.(null);
        };
    }, [romFile, resolveCore]);

    /* -----------------------------
       Auto-Save & Play Tracking
    ------------------------------ */
    useEffect(() => {
        if (isLoading || !gameId || !nostalgistRef.current) return;

        const intervalId = setInterval(async () => {
            // 1. Update Play History (add 10 seconds)
            await PlayHistoryStorage.updatePlayHistory(gameId, 10);

            // 2. Auto-save current emulator state
            try {
                if (nostalgistRef.current) {
                    const state = await nostalgistRef.current.saveState();
                    await SaveStateStorage.saveAutoState(gameId, state.state);
                }
            } catch (err) {
                console.error("Auto-save failed during gameplay:", err);
            }
        }, 10000); // run every 10 seconds

        return () => {
            clearInterval(intervalId);
        };
    }, [gameId, isLoading]);

    /* -----------------------------
       Resize Handling
    ------------------------------ */
    useEffect(() => {
        if (!canvasRef.current) return;

        resizeObserverRef.current = new ResizeObserver((entries) => {
            if (entries.length > 0 && nostalgistRef.current?.resize) {
                const { width, height } = entries[0].contentRect;
                nostalgistRef.current.resize({ width, height });
            }
        });

        resizeObserverRef.current.observe(canvasRef.current);

        return () => {
            resizeObserverRef.current?.disconnect();
        };
    }, []);

    /* -----------------------------
       Empty State
    ------------------------------ */
    if (!romFile) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#050505] shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                <div className="text-[var(--retro-text-muted)] animate-pulse tracking-widest text-[9px] font-bold text-center leading-loose">
                    INSERT<br />CARTRIDGE<br />TO PLAY
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col bg-black border-4 border-[#111] overflow-hidden group">

            {/* Loading Overlay */}
            <div
                className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-black text-[var(--retro-neon)] transition-opacity duration-500 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
            >
                <div className="w-12 h-12 border-4 border-[var(--retro-neon-dim)] border-t-[var(--retro-neon)] rounded-full animate-spin"></div>
                <p className="animate-pulse tracking-widest font-bold text-[10px] mt-4">
                    BOOTING SYSTEM...
                </p>
            </div>

            {/* Emulator Display */}
            <div className="flex-1 w-full h-full flex items-center justify-center bg-black relative">
                <div
                    className={`relative w-full h-full flex items-center justify-center overflow-hidden 
                    ${userSettings?.crtFilterEnabled ? 'crt-filter text-shadow-glow' : ''} 
                    ${userSettings?.scanlinesEnabled ? 'scanlines' : ''}`}
                >
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full object-contain pixelated outline-none"
                        style={{ imageRendering: 'pixelated' }}
                        tabIndex={0}
                    />

                    {/* CRT Vignette */}
                    {userSettings?.crtFilterEnabled && (
                        <div className="absolute inset-0 pointer-events-none rounded-[8%] shadow-[inset_0_0_120px_rgba(0,0,0,0.65)] z-10"></div>
                    )}

                    {/* Scanlines */}
                    {userSettings?.scanlinesEnabled && (
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_3px] z-10"></div>
                    )}
                </div>
            </div>
        </div>
    );
};