import React from 'react';
import { Card } from '@retrovault/ui';
import { Maximize } from 'lucide-react';
import type { GameMetadata } from '@retrovault/core';

interface TelemetryDashboardProps {
  telemetry: { fps: number; ram: number; vram: number; history: number[] };
  activeGame: { metadata: GameMetadata, file: File } | null;
  handleFullscreen: () => void;
}

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({
  telemetry,
  activeGame,
  handleFullscreen,
}) => {
  return (
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
  );
};
