import React from 'react';
import type { ChangeEvent } from 'react';
import { Card } from '@retrovault/ui';
import { Settings2 } from 'lucide-react';
import type { UserSettings } from '@retrovault/db';

interface HardwareConfigProps {
  userSettings: UserSettings | null;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setIsKeyBindingModalOpen: (isOpen: boolean) => void;
  setIsCasingModalOpen: (isOpen: boolean) => void;
}

export const HardwareConfig: React.FC<HardwareConfigProps> = ({
  userSettings,
  updateSettings,
  setIsKeyBindingModalOpen,
  setIsCasingModalOpen,
}) => {
  return (
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
  );
};
