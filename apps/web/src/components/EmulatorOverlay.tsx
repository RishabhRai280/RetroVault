import { useEffect, useRef, useState } from 'react';
import { Nostalgist } from 'nostalgist';
import { Maximize, Minimize, X, Settings2 } from 'lucide-react';
import { Button } from '@retrovault/ui';

/**
 * Props expected by the EmulatorOverlay component.
 */
interface EmulatorOverlayProps {
    romFile: File | null; // The exact binary snapshot file returned by File System Access API
    platform: 'GBA' | 'SNES' | 'NES' | 'UNKNOWN'; // The platform enum to decide which RetroArch core to use
    onClose: () => void; // Callback fired when the user selects the X/close button
}

/**
 * A modal overlay that mounts the Nostalgist.js instance.
 * It takes care of launching the emulator into a canvas, keeping track of fullscreen state,
 * and cleaning up the instance when the modal is closed.
 */
export const EmulatorOverlay = ({ romFile, platform, onClose }: EmulatorOverlayProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

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
                    <div className="flex gap-2">
                        <Button variant="icon" size="sm" onClick={toggleFullscreen}>
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </Button>
                        <Button variant="icon" size="sm">
                            <Settings2 size={20} />
                        </Button>
                        <Button variant="icon" size="sm" onClick={onClose} className="hover:bg-red-500/20 text-red-500 hover:text-red-400">
                            <X size={20} />
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
                    <canvas
                        ref={canvasRef}
                        className="w-full h-full object-contain pixelated"
                        style={{ imageRendering: 'pixelated' }}
                        tabIndex={0}
                    />
                </div>
            </div>
        </div>
    );
};
