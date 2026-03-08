/**
 * @file EmulatorConsole.tsx
 * @description The core emulation runtime component for RetroVault.
 *
 * This component is responsible for the entire lifecycle of a single emulation session:
 *  - Fetching and compiling the correct Libretro WASM core for the given platform
 *  - Launching Nostalgist.js against a <canvas> element embedded in the Game Boy shell
 *  - Restoring any previously saved auto-state from localforage on boot
 *  - Auto-saving the emulator state every 30 seconds in the background
 *  - Tracking cumulative play time every 10 seconds
 *  - Dynamically resizing the canvas when the container element changes dimensions
 *  - Displaying a BSOD-style error overlay if the WASM core fails to initialize
 *  - Displaying a "ALLOCATING MEMORY..." loading overlay while the WASM core compiles
 *
 * @architecture
 *  EmulatorConsole does NOT hold any of the high-level game library or save-state UI logic.
 *  That responsibility belongs to App.tsx. EmulatorConsole only knows:
 *    1. What ROM file to run
 *    2. Which platform it is
 *    3. What volume to use
 *    4. What key bindings to apply
 *
 *  The parent (App.tsx) receives the live Nostalgist instance back via `onReady`, giving it
 *  control over save/load operations, press simulation, and graceful exit.
 *
 * @performance
 *  CRITICAL: `volume`, `keyBindings`, `onLog`, and `onReady` are intentionally EXCLUDED
 *  from the emulator boot `useEffect` dependency array. These are callback/scalar props
 *  that change reference on every parent re-render (FPS ticker, log append, etc.).
 *  Including them in deps would destroy and restart the WASM core on every telemetry tick.
 *  Instead, all four are stored in `useRef` containers that are always up-to-date, but
 *  never trigger a React re-render or effect re-run.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Nostalgist } from 'nostalgist';
import { SettingsStorage, PlayHistoryStorage, SaveStateStorage, type UserSettings, type KeyBindings } from '@retrovault/db';
import { AlertTriangle, PowerOff } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Web Audio API Intercept for Live Volume Control
// ─────────────────────────────────────────────────────────────────────────────
// WHY: Nostalgist/RetroArch only reads `audio_volume` config on initial boot.
// To achieve instantly responsive slider volume without restarting the game,
// we intercept the Web Audio `connect()` method globally to insert a Master Gain Node
// just before the speakers (AudioDestinationNode).

if (typeof window !== 'undefined' && !(window as any).__rvAudioIntercepted && window.AudioNode) {
    (window as any).__rvAudioIntercepted = true;
    const origConnect = window.AudioNode.prototype.connect;
    
    // Override the connect method to inject our gain node
    (window as any).AudioNode.prototype.connect = function(this: AudioNode, destination: any, outputIndex?: number, inputIndex?: number): any {
        // If this node is trying to connect to the final speakers
        if (destination === this.context.destination) {
            const ctx = this.context as any;
            if (!ctx.__rvMasterGain) {
                // Create our interceptor node
                ctx.__rvMasterGain = ctx.createGain();
                // Set initial volume
                ctx.__rvMasterGain.gain.value = (window as any).__rvCurrentVolume ?? 1;
                // Connect our gain node to the speakers
                origConnect.call(ctx.__rvMasterGain, destination);
                // Expose globally for the React component to tweak
                (window as any).__rvMasterGainNode = ctx.__rvMasterGain;
            }
            // Route the original signal into our gain node instead
            return origConnect.apply(this, [ctx.__rvMasterGain, outputIndex, inputIndex].filter(x => x !== undefined) as any);
        }
        // Passthrough for all other internal audio connections
        return origConnect.apply(this, arguments as any);
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props contract for the EmulatorConsole component.
 * All props that change frequently (volume, onLog, etc.) are read via useRef
 * internally so they don't restart the emulator on re-render.
 */
interface EmulatorConsoleProps {
    /** Stable unique identifier for the game, derived as `${fileName}-${fileSize}`. Used as the key for save-state and play-history records. */
    gameId: string;
    /** Human-readable game title, used only for display in system log messages. */
    gameTitle: string;
    /** The raw File object read from the user's local directory via the File System Access API. Setting this to null renders the idle screen. */
    romFile: File | null;
    /** Platform string, e.g., 'GBA', 'SNES', 'NES'. Used to resolve the correct Libretro WASM core. */
    platform: string;
    /** Linear volume from 0.0 (mute) to 1.0 (max). Converted to dB internally before passing to libretro. */
    volume: number;
    /** Optional user-configured key bindings. If not provided, Nostalgist uses its own defaults. */
    keyBindings?: KeyBindings;
    /** Callback fired when the user clicks "Eject Cartridge" from the error overlay. App.tsx uses this to clear `activeGame`. */
    onClose: () => void;
    /** Callback fired once the Nostalgist instance is fully booted. App.tsx stores this reference for save/load/pressDown operations. */
    onReady?: (nostalgist: Nostalgist) => void;
    /** Callback for appending messages to the System Logs panel in App.tsx. Wrapped in a useRef to avoid restarting the emulator. */
    onLog?: (message: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps internal platform codes (computed from file extension in @retrovault/core)
 * to the Nostalgist/Libretro core identifier strings.
 *
 * These core names are fetched from the Nostalgist CDN on first use and cached
 * by the browser. Expect an initial ~2-10MB download per unique core.
 *
 * - `mgba`            → Game Boy Advance (recommended over vba-m for accuracy)
 * - `snes9x`          → Super Nintendo/Famicom
 * - `fceumm`          → NES/Famicom (high compatibility variant)
 * - `gambatte`        → Game Boy and Game Boy Color
 * - `genesis_plus_gx` → Sega Genesis / Mega Drive
 */
const CORE_MAP: Record<string, string> = {
    GBA: 'mgba',
    SNES: 'snes9x',
    NES: 'fceumm',
    GB: 'gambatte',
    GBC: 'gambatte',
    MD: 'genesis_plus_gx',
    GENESIS: 'genesis_plus_gx'
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * EmulatorConsole — Nostalgist.js powered emulation runtime component.
 *
 * Renders either:
 *  - An idle "NO CARTRIDGE DETECTED" screen when `romFile` is null
 *  - A full emulation session with loading/error overlays when `romFile` is set
 *
 * @param props - See `EmulatorConsoleProps` for full documentation of each prop.
 */
export function EmulatorConsole({ gameId, gameTitle, romFile, platform, volume, keyBindings, onClose, onReady, onLog }: EmulatorConsoleProps) {

    // ── DOM Refs ─────────────────────────────────────────────────────────────

    /**
     * Direct reference to the <canvas> DOM element that Nostalgist renders into.
     * Passed to Nostalgist.launch() as the rendering target. Must be present in
     * the DOM when launch() is called, so this always points to a mounted element.
     */
    const canvasRef = useRef<HTMLCanvasElement>(null);

    /**
     * Holds the live Nostalgist instance after a successful launch.
     * Using a ref (not state) prevents React from triggering re-renders when it
     * is assigned. Only the boot effect and cleanup function read/write this.
     */
    const nostalgistRef = useRef<Nostalgist | null>(null);

    /**
     * Holds the ResizeObserver instance so it can be disconnected on unmount
     * without needing it in the component's state.
     */
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    /**
     * Reference to the container <div> that wraps the canvas.
     * The ResizeObserver watches this element. When its dimensions change
     * (e.g., window resize, sidebar collapse), it calls nostalgist.resize().
     */
    const containerRef = useRef<HTMLDivElement>(null);

    // ── UI State ─────────────────────────────────────────────────────────────

    /** True while Nostalgist is fetching the WASM core and initializing. Controls the loading overlay visibility. */
    const [isLoading, setIsLoading] = useState(false);

    /** Holds any fatal error string thrown during Nostalgist.launch(). Triggers the BSOD error overlay when non-null. */
    const [error, setError] = useState<string | null>(null);

    /**
     * Local copy of the user's display settings (CRT filter, scanlines).
     * Loaded once on mount from localforage. Used to apply visual post-processing
     * classes to the canvas wrapper div.
     */
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);

    // ── Settings Loader Effect ────────────────────────────────────────────────

    /**
     * Loads visual display settings from localforage on first mount only.
     * The `active` flag prevents a state update if the component unmounts
     * before the async localforage read completes (avoids memory-leak warning).
     */
    useEffect(() => {
        let active = true;
        SettingsStorage.getSettings().then(settings => {
            if (active) setUserSettings(settings);
        });
        return () => { active = false; };
    }, []); // Empty deps = runs once on mount

    // ── Stable Prop Refs ─────────────────────────────────────────────────────

    /**
     * Stable mutable refs for props that change on every parent render.
     *
     * WHY: React's useEffect re-runs when any dep in its array changes reference.
     * Props like `onLog` (a new function object each render) and `volume` change on
     * every FPS telemetry tick in App.tsx. If included in the boot effect's dep array,
     * the WASM emulator would be torn down and restarted constantly.
     *
     * SOLUTION: Store the latest value in a ref synchronously in its own sync effect.
     * The boot effect reads from these refs at the moment it needs the values, always
     * getting the current data without declaring the dependency.
     */
    const volumeRef = useRef(volume);
    const keyBindingsRef = useRef(keyBindings);
    const onLogRef = useRef(onLog);
    const onReadyRef = useRef(onReady);

    /** Keeps all stable refs synchronized with the latest prop values on every render. */
    useEffect(() => {
        volumeRef.current = volume;
        keyBindingsRef.current = keyBindings;
        onLogRef.current = onLog;
        onReadyRef.current = onReady;

        // Keep our global Web Audio intercept sync'd with the latest volume prop
        (window as any).__rvCurrentVolume = volume;
        if ((window as any).__rvMasterGainNode) {
            // Apply a tiny time constant to prevent audio "popping" during hard slider movements
            const gainNode = (window as any).__rvMasterGainNode as GainNode;
            gainNode.gain.setTargetAtTime(Math.max(0, volume), gainNode.context.currentTime, 0.05);
        }
    }, [volume, keyBindings, onLog, onReady]);

    // ── Core Resolver ─────────────────────────────────────────────────────────

    /**
     * Returns the Libretro core name and optional BIOS config for the current platform.
     *
     * `useCallback` is used so resolveCore has a stable identity when `platform` doesn't
     * change — preventing unnecessary re-renders of consuming effects.
     *
     * Falls back to `mgba` if the platform string is unrecognized (e.g., 'UNKNOWN').
     */
    const resolveCore = useCallback(() => {
        const normalizedPlatform = platform.toUpperCase().trim();
        const coreName = CORE_MAP[normalizedPlatform] ?? 'mgba'; // Safe fallback for unknown platforms
        return {
            core: coreName,
            bios: undefined, // No BIOS files are bundled — most open-source cores work without them
        };
    }, [platform]); // Only re-computes when the platform string actually changes

    // ── Emulator Boot Effect ──────────────────────────────────────────────────

    /**
     * The primary emulator lifecycle effect. Boots Nostalgist when `romFile` becomes
     * non-null, and tears it down cleanly when the component unmounts or `romFile` changes.
     *
     * DEPENDENCY ARRAY: [romFile, resolveCore, gameId, gameTitle, platform]
     *  - `romFile`: The trigger — a new ROM means boot a new session
     *  - `resolveCore`: Stable memoized fn, changes only when `platform` changes
     *  - `gameId`, `gameTitle`, `platform`: Used inside the async body, must be declared
     *
     * EXPLICITLY EXCLUDED: `volume`, `keyBindings`, `onLog`, `onReady`
     *  These are read from stable useRef containers so they never trigger a re-boot.
     */
    useEffect(() => {
        // Guard: don't attempt boot without both a ROM file and a mounted canvas
        if (!romFile || !canvasRef.current) return;

        /**
         * `mounted` tracks whether the component is still in the DOM by the time
         * the async launch resolves. If the user switches games rapidly, the previous
         * game's async boot may complete after the new game is already loading.
         * In that case, we call nostalgist.exit() immediately to avoid zombie instances.
         */
        let mounted = true;
        let nostalgist: Nostalgist | null = null;

        const bootEmulator = async () => {
            // Wait 50ms for the browser to fully compute the container's layout dimensions.
            // Without this, clientWidth/clientHeight may read as 0 on the first render.
            await new Promise(res => setTimeout(res, 50));

            // Re-check refs after the async gap — component may have unmounted
            if (!containerRef.current || !romFile) return;

            // Show the "ALLOCATING MEMORY..." loading overlay
            setIsLoading(true);
            setError(null);

            try {
                // Emit to the System Logs panel in App.tsx
                if (onLogRef.current) onLogRef.current(`Initializing core [${resolveCore().core}] for ${platform}...`);

                const currentBindings = keyBindingsRef.current;
                const resolvedCore = resolveCore();

                /**
                 * Launch the Nostalgist emulation session.
                 * This call:
                 *  1. Fetches the WASM core binary from Nostalgist's CDN (or browser cache)
                 *  2. Compiles and instantiates the WASM module
                 *  3. Pipes video output to `canvasRef.current`
                 *  4. Pipes audio output to the Web Audio API
                 *  5. Applies retroarch.cfg overrides from `retroarchConfig`
                 */
                nostalgist = await Nostalgist.launch({
                    rom: romFile,                   // The raw File object from the FS Access API
                    core: resolvedCore.core,        // e.g., 'mgba' for GBA
                    element: canvasRef.current!,    // The <canvas> DOM element to render into
                    retroarchConfig: {
                        // NOTE: audio_volume is INTENTIONALLY OMITTED here so RetroArch runs at default 0dB internal volume.
                        // Actual volume scaling is handled safely by our WebAudio Master Gain interceptor above.
                        savestate_auto_save: true,              // Libretro internal auto-save (separate from ours)
                        savestate_auto_load: true,              // Libretro internal auto-load on boot
                        rewind_enable: true,                    // Enable rewind buffer
                        rewind_buffer_size: 10485760,           // 10MB rewind buffer
                        rewind_granularity: 2,                  // Save state every 2 frames for rewind
                        input_rewind: currentBindings?.rewind || 'backspace',
                        input_hold_fast_forward: currentBindings?.fastForward || 'space',
                        input_toggle_fullscreen: currentBindings?.fullScreen || 'f',
                        ...(currentBindings ? {
                            // Map our UI key binding names to libretro retroarch config keys
                            input_player1_up: currentBindings.up,
                            input_player1_down: currentBindings.down,
                            input_player1_left: currentBindings.left,
                            input_player1_right: currentBindings.right,
                            input_player1_a: currentBindings.a,
                            input_player1_b: currentBindings.b,
                            input_player1_start: currentBindings.start,
                            input_player1_select: currentBindings.select,
                        } : {}) // If no custom bindings, use Nostalgist defaults
                    },
                    size: {
                        // Use the container's measured pixel size so the canvas fills exactly
                        width: containerRef.current.clientWidth || 300,
                        height: containerRef.current.clientHeight || 250
                    },
                    bios: resolvedCore.bios, // Undefined for all current platforms (no BIOS bundled)
                });

                /**
                 * Check if the component is still mounted.
                 * If the user switches games while Nostalgist was loading, `mounted` is false.
                 * In this case, we must immediately call .exit() on the zombie instance.
                 */
                if (!mounted) {
                    nostalgist.exit();
                    return;
                }

                // Store the live instance in a ref so auto-save intervals and parent callbacks can access it
                nostalgistRef.current = nostalgist;

                // Notify App.tsx with the live instance so it can call pressDown/pressUp, saveState, loadState
                onReadyRef.current?.(nostalgist);

                /**
                 * Attempt to restore the last auto-saved state for this game.
                 * Auto-saves are stored in localforage under key: `auto_save_blob_${gameId}`
                 * This gives the illusion of true continuous save — the game resumes exactly where you left off.
                 * Wrapped in its own try/catch so a missing or corrupt auto-save doesn't crash the boot flow.
                 */
                try {
                    const autoSaveBlob = await SaveStateStorage.loadAutoState(gameId);
                    if (autoSaveBlob) {
                        if (onLogRef.current) onLogRef.current(`Restoring prior background state...`);
                        await nostalgist.loadState(autoSaveBlob);
                    }
                } catch (e) {
                    // Non-fatal: if auto-save restoration fails, the game simply starts fresh
                    console.warn("Could not load save state automatically", e);
                }

                // Focus the canvas so keyboard input is captured immediately on game launch
                canvasRef.current?.focus();

                // Hide the loading overlay
                setIsLoading(false);

            } catch (err) {
                // Fatal boot failure — show the BSOD error overlay
                console.error('Emulator launch failed:', err);
                setError(err instanceof Error ? err.message : String(err));
                setIsLoading(false);
                onLogRef.current?.(`Emulator launch failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        };

        bootEmulator();

        /**
         * Cleanup function — runs when:
         *  a) The component unmounts (user navigates away)
         *  b) `romFile` changes (user clicks a different game)
         *
         * Calls nostalgist.exit() to stop the emulation loop, free WASM memory, and
         * stop the Web Audio output. Without this, old sessions keep running invisibly.
         */
        return () => {
            mounted = false;
            if (nostalgistRef.current) {
                onLogRef.current?.(`Emulator gracefully closed for ${gameTitle}.`);
                nostalgistRef.current.exit();
                nostalgistRef.current = null;
            }
        };
    }, [romFile, resolveCore, gameId, gameTitle, platform]);
    //   ^^^^^^^ Core dep: new ROM = new session
    //                      ^^^^^^^^^^^^ Stable memoized fn (changes only with platform)
    //                                   ^^^^^^^ Used as storage key for save states
    //                                            ^^^^^^^^^^ Used in log messages only
    //                                                        ^^^^^^^^ Used by resolveCore — declared for correctness

    // ── Auto-Save & Play Tracking Effect ─────────────────────────────────────

    /**
     * Starts two background intervals once the emulator is running:
     *
     * 1. PLAY TIME TRACKER (every 10 seconds)
     *    Increments the cumulative play time for this game in localforage.
     *    This powers the playtime badge displayed on each cartridge card in the Library.
     *
     * 2. AUTO-SAVE (every 30 seconds)
     *    Calls nostalgist.saveState() to extract the current WASM memory snapshot,
     *    then overwrites the single auto-save slot in localforage.
     *    The 30-second interval was chosen as a balance between data safety and
     *    avoiding micro-stutters during heavy emulation (saveState is synchronous WASM).
     *
     * Guards: Only starts if isLoading is false, no error occurred, and a Nostalgist
     * instance is confirmed to exist in the ref.
     *
     * Cleanup: Both intervals are cleared when the effect re-runs or the component unmounts.
     */
    useEffect(() => {
        // Don't start intervals if the emulator isn't fully running yet
        if (isLoading || error || !gameId || !nostalgistRef.current) return;

        // Interval 1: Play time tracking (10-second granularity)
        const playHistoryIntervalId = setInterval(async () => {
            await PlayHistoryStorage.updatePlayHistory(gameId, 10);
        }, 10000);

        // Interval 2: Background auto-save (30-second period to minimize stutter)
        const stateLoop = setInterval(async () => {
            if (nostalgistRef.current) {
                try {
                    const state = await nostalgistRef.current.saveState();
                    // `state.state` is a Blob containing the full WASM memory snapshot
                    await SaveStateStorage.saveAutoState(gameId, state.state);
                    if (onLogRef.current) onLogRef.current(`Background autosave completed.`);
                } catch (e) {
                    // Non-fatal: log to console only, don't surface to UI
                    console.warn("Failed auto-save operation", e);
                }
            }
        }, 30000);

        // Cleanup: stop both intervals when game changes or component unmounts
        return () => {
            clearInterval(playHistoryIntervalId);
            clearInterval(stateLoop);
        };
    }, [gameId, isLoading, error]); // Re-evaluates guard conditions when loading/error state changes

    // ── Resize Handling Effect ────────────────────────────────────────────────

    /**
     * Attaches a ResizeObserver to the container div that wraps the canvas.
     * When the container's dimensions change (e.g., window resize, mobile orientation change,
     * sidebar expand/collapse), Nostalgist's `resize()` method is called to re-scale
     * the internal rendering buffer and output canvas to the new pixel dimensions.
     *
     * Empty dep array: only runs once on mount. The observer stays attached until unmount.
     */
    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        resizeObserverRef.current = new ResizeObserver((entries) => {
            // Only resize if Nostalgist is running and the resize API is available
            if (entries.length > 0 && nostalgistRef.current?.resize) {
                const { width, height } = entries[0].contentRect;
                nostalgistRef.current.resize({ width, height });
            }
        });

        // Begin observing the container div for size changes
        resizeObserverRef.current.observe(containerRef.current);

        return () => {
            // Disconnect the observer on unmount to prevent memory leaks
            resizeObserverRef.current?.disconnect();
        };
    }, []); // Deliberately empty — the observer is set up once and manages itself

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * IDLE STATE: No ROM loaded
     * Renders a dark screen with a pulsing "NO CARTRIDGE DETECTED" message
     * and a power-off icon, matching the aesthetic of an actual Game Boy with no cartridge.
     */
    if (!romFile) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-[#050505] shadow-[inset_0_0_30px_rgba(0,0,0,0.9)] border-4 border-[#111] overflow-hidden">
                <div className="text-[#333] animate-pulse tracking-widest text-[10px] font-black text-center leading-loose flex flex-col items-center gap-2">
                    <PowerOff size={24} className="mb-2 opacity-50" />
                    NO CARTRIDGE<br />DETECTED
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col bg-black overflow-hidden group">

            {/* ── Error Overlay ────────────────────────────────────────────────
                Displayed when Nostalgist.launch() throws a fatal error.
                Styled as a retro BSOD (Blue Screen of Death) for thematic consistency.
                The "Eject Cartridge" button calls onClose(), which clears activeGame
                in App.tsx and resets to the idle state.
            ────────────────────────────────────────────────────────────────── */}
            {error && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0000aa] text-white p-4 text-center font-mono">
                    <AlertTriangle size={32} className="mb-4 text-yellow-400" />
                    <h2 className="text-sm font-bold uppercase mb-2 bg-white text-[#0000aa] px-2">Fatal Exception</h2>
                    <p className="text-[10px] break-words max-w-full opacity-90 leading-relaxed">
                        A critical error occurred while initializing the RetroArch core: <br /><br />
                        <span className="text-[#55ffff]">{error}</span>
                    </p>
                    <button
                        onClick={onClose}
                        className="mt-6 px-4 py-1.5 border-2 border-white text-[10px] uppercase font-bold hover:bg-white hover:text-[#0000aa] transition-colors"
                    >
                        Eject Cartridge
                    </button>
                </div>
            )}

            {/* ── Loading Overlay ──────────────────────────────────────────────
                Shown while Nostalgist is downloading and compiling the WASM core.
                Uses CSS transition (opacity-0 → opacity-100) to fade in/out smoothly.
                `pointer-events-none` when hidden prevents it from blocking canvas clicks.
            ────────────────────────────────────────────────────────────────── */}
            <div
                className={`absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm text-[var(--retro-neon)] transition-opacity duration-500 ${isLoading && !error ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                {/* Dual-ring spinning loader — outer ring spins CW, inner ring spins CCW */}
                <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#333] border-t-[var(--retro-neon)] rounded-full animate-spin"></div>
                    <div className="absolute w-6 h-6 border-4 border-[#333] border-b-[var(--retro-neon)] rounded-full animate-spin direction-reverse"></div>
                </div>
                <p className="animate-pulse tracking-widest font-bold text-[10px] mt-6">
                    ALLOCATING MEMORY...
                </p>
            </div>

            {/* ── Emulator Display Container ────────────────────────────────────
                The `containerRef` div is what the ResizeObserver watches.
                Clicking anywhere here focuses the canvas, which enables keyboard input.
                The inner div applies optional post-processing CSS classes based on settings.
            ────────────────────────────────────────────────────────────────── */}
            <div
                ref={containerRef}
                className="flex-1 w-full h-full flex items-center justify-center bg-black relative"
                onClick={() => canvasRef.current?.focus()} // Re-focus canvas on any click in the container
            >
                <div
                    className={`relative w-full h-full flex items-center justify-center overflow-hidden 
                    ${userSettings?.crtFilterEnabled ? 'crt-filter text-shadow-glow' : ''} 
                    ${userSettings?.scanlinesEnabled ? 'scanlines' : ''}`}
                >
                    {/* ── The Emulator Canvas ──────────────────────────────────
                        This is the DOM element Nostalgist renders game video into.
                        - `imageRendering: pixelated` ensures crisp pixel art scaling (no blur)
                        - `object-contain` preserves the game's original aspect ratio
                        - `tabIndex={0}` makes it focusable so it captures keyboard events
                        - `cursor-crosshair` provides a subtle UX cue that this is an interactive area
                    ────────────────────────────────────────────────────────── */}
                    <canvas
                        key={gameId}
                        ref={canvasRef}
                        className="w-full h-full object-contain pixelated outline-none cursor-crosshair"
                        style={{ imageRendering: 'pixelated' }}
                        tabIndex={0} // Required for keyboard focus
                    />

                    {/* ── CRT Vignette Mask ────────────────────────────────────
                        A purely cosmetic overlay that simulates the characteristic
                        dark curved edges of vintage CRT phosphor screens.
                        Only rendered when `crtFilterEnabled` is true in settings.
                    ────────────────────────────────────────────────────────── */}
                    {userSettings?.crtFilterEnabled && (
                        <div className="absolute inset-0 pointer-events-none rounded-[8%] shadow-[inset_0_0_120px_rgba(0,0,0,0.8)] z-10 border border-white/5"></div>
                    )}

                    {/* ── Scanlines Mask ───────────────────────────────────────
                        A repeating gradient overlay creating horizontal scanline bands
                        at 3px pitch. Replicates the visible phosphor row structure
                        on old CRT televisions and LCD handhelds.
                        Only rendered when `scanlinesEnabled` is true in settings.
                    ────────────────────────────────────────────────────────── */}
                    {userSettings?.scanlinesEnabled && (
                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.35)_50%)] bg-[length:100%_3px] z-10 mix-blend-multiply"></div>
                    )}
                </div>
            </div>
        </div>
    );
}