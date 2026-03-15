import React from 'react';
import { Card } from '@retrovault/ui';
import { X } from 'lucide-react';
import type { CasingTheme, UserSettings } from '@retrovault/db';
import { getCasingClasses, getCasingStyles } from './CasingUtils';

interface CasingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempCasing: CasingTheme;
  setTempCasing: React.Dispatch<React.SetStateAction<CasingTheme>>;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

export const CasingModal: React.FC<CasingModalProps> = ({
  isOpen,
  onClose,
  tempCasing,
  setTempCasing,
  updateSettings,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in text-[#333]">
      <Card className="w-full max-w-4xl p-6 md:p-8 bg-[#e0ddcf] border-[4px] border-[#b5b2a3] shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_4px_10px_rgba(255,255,255,0.5)] !rounded-xl relative texture-plastic flex flex-col md:flex-row gap-8">
        <button
          onClick={onClose}
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
            <button onClick={onClose} className="flex-1 py-3 bg-[#e0ddcf] border-[3px] border-[#b5b2a3] text-[#4a4b52] shadow-md hover:bg-[#c0bdae] active:translate-y-[2px] active:border-b-[3px] rounded text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">Cancel</button>
            <button onClick={() => { updateSettings({ casingTheme: tempCasing }); onClose(); }} className="flex-1 py-3 bg-[#1a1a1a] text-[var(--retro-neon)] border-[3px] border-[#333] shadow-[0_4px_8px_rgba(0,0,0,0.5)] hover:bg-[#222] active:translate-y-[2px] active:shadow-inner rounded text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer">Save Mod</button>
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
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
