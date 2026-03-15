import React from 'react';
import { Card } from '@retrovault/ui';
import { X } from 'lucide-react';
import { type KeyBindings, type UserSettings, DEFAULT_SETTINGS } from '@retrovault/db';

interface KeyBindingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listeningKey: keyof KeyBindings | null;
  setListeningKey: (key: keyof KeyBindings | null) => void;
  userSettings: UserSettings | null;
}

export const KeyBindingModal: React.FC<KeyBindingModalProps> = ({
  isOpen,
  onClose,
  listeningKey,
  setListeningKey,
  userSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in text-[#333]">
      <Card className="w-full max-w-md p-6 bg-[#e0ddcf] border-[4px] border-[#b5b2a3] shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_4px_10px_rgba(255,255,255,0.5)] !rounded-xl relative texture-plastic">
        <button
          onClick={onClose}
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
            onClick={onClose} 
            className="w-full py-3 bg-[#1a1a1a] text-[var(--retro-neon)] border-[3px] border-[var(--retro-neon)] shadow-[4px_4px_0_rgba(0,0,0,0.8)] active:translate-y-1 active:shadow-none hover:bg-[var(--retro-neon)] hover:text-black font-black uppercase tracking-widest transition-all rounded"
          >
            DONE
          </button>
        </div>
      </Card>
    </div>
  );
};
