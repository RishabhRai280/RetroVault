import React from 'react';
import { Card } from '@retrovault/ui';
import { Menu } from 'lucide-react';
import type { SaveStateMetadata } from '@retrovault/db';

interface SaveStatesPanelProps {
  saveStates: SaveStateMetadata[];
  handleCreateSave: () => void;
  handleLoadState: (id: string) => void;
  emulatorInstance: any;
  activeGame: any;
}

export const SaveStatesPanel: React.FC<SaveStatesPanelProps> = ({
  saveStates,
  handleCreateSave,
  handleLoadState,
  emulatorInstance,
  activeGame,
}) => {
  return (
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
  );
};
