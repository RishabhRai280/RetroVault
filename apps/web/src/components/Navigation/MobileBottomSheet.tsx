import React from 'react';
import type { ChangeEvent } from 'react';
import { Library as LibraryIcon, X, Gamepad2, Settings2, Save, ScrollText, Activity, SlidersHorizontal } from 'lucide-react';
import type { GameMetadata } from '@retrovault/core';
import type { PlayHistory, SaveStateMetadata, UserSettings } from '@retrovault/db';
import { GameCartridge } from '../Library/GameCartridge';

interface MobileBottomSheetProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  mobileTab: 'library' | 'saves' | 'logs' | 'telemetry' | 'config';
  setMobileTab: (tab: 'library' | 'saves' | 'logs' | 'telemetry' | 'config') => void;
  games: GameMetadata[];
  filteredGames: GameMetadata[];
  isScanning: boolean;
  dirHandle: FileSystemDirectoryHandle | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  platformFilter: string;
  setPlatformFilter: (filter: 'ALL' | 'GBA' | 'GBC' | 'GB' | 'SNES' | 'NES') => void;
  playHistory: Record<string, PlayHistory>;
  activeGame: { metadata: GameMetadata, file: File } | null;
  setActiveGame: (game: { metadata: GameMetadata, file: File } | null) => void;
  setEmulatorInstance: (instance: any) => void;
  addLog: (message: string) => void;
  handleSelectVault: () => void;
  saveStates: SaveStateMetadata[];
  handleCreateSave: () => void;
  handleLoadState: (id: string) => void;
  emulatorInstance: any;
  systemLogs: { time: Date; message: string }[];
  telemetry: { fps: number; ram: number; vram: number; history: number[] };
  userSettings: UserSettings | null;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setIsKeyBindingModalOpen: (isOpen: boolean) => void;
  setIsCasingModalOpen: (isOpen: boolean) => void;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  setIsOpen,
  mobileTab,
  setMobileTab,
  games,
  filteredGames,
  isScanning,
  dirHandle,
  searchQuery,
  setSearchQuery,
  platformFilter,
  setPlatformFilter,
  playHistory,
  activeGame,
  setActiveGame,
  setEmulatorInstance,
  addLog,
  handleSelectVault,
  saveStates,
  handleCreateSave,
  handleLoadState,
  emulatorInstance,
  systemLogs,
  telemetry,
  userSettings,
  updateSettings,
  setIsKeyBindingModalOpen,
  setIsCasingModalOpen,
}) => {
  return (
    <>
      {/* Bottom Tab Bar — icon-only, premium pill-highlight style */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around bg-[#e0ddcf] border-t-[3px] border-[var(--retro-neon)] shadow-[0_-4px_20px_rgba(0,0,0,0.5)] texture-plastic"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: '60px' }}
      >
        {([
          { id: 'library', Icon: LibraryIcon, label: 'Library' },
          { id: 'saves', Icon: Save, label: 'Saves' },
          { id: 'logs', Icon: ScrollText, label: 'Logs' },
          { id: 'telemetry', Icon: Activity, label: 'Telemetry' },
          { id: 'config', Icon: SlidersHorizontal, label: 'Config' },
        ] as const).map(({ id, Icon, label }) => {
          const isActive = isOpen && mobileTab === id;
          return (
            <button
              key={id}
              aria-label={label}
              onClick={() => { setMobileTab(id); setIsOpen(id === mobileTab ? !isOpen : true); }}
              className="flex-1 flex flex-col items-center justify-center h-full relative group active:scale-95 transition-transform"
            >
              <span className={`absolute inset-x-1.5 top-1.5 bottom-1.5 rounded-lg transition-all duration-300 ${isActive ? 'bg-[var(--retro-neon)]/15 ring-1 ring-[var(--retro-neon)]/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]' : 'bg-transparent'}`} />
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={`relative z-10 transition-all duration-200 ${isActive ? 'text-[var(--retro-neon)] drop-shadow-[0_0_8px_var(--retro-neon)]' : 'text-[#8c897d] group-active:text-[#4a4b52]'}`}
              />
              <span className={`mt-0.5 w-1.5 h-1.5 rounded-full transition-all duration-200 relative z-10 ${isActive ? 'bg-[var(--retro-neon)] shadow-[0_0_6px_var(--retro-neon)]' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </nav>

      {/* Bottom Sheet Panel */}
      <div
        className={`lg:hidden fixed left-0 right-0 bottom-[52px] z-30 bg-[#e0ddcf] rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.6)] border-t-2 border-[#c0bdae] transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ maxHeight: '70vh' }}
      >
        <div className="flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#aaa]"></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-6 pt-2">
          {mobileTab === 'library' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest">Library</h3>
                <button onClick={handleSelectVault} className="text-[10px] py-1.5 px-4 bg-[#a61022] hover:bg-[#800a16] text-white border-b-4 border-[#5a000a] active:border-b-0 active:translate-y-1 transition-all rounded-full shadow-md font-bold">
                  {dirHandle ? 'CHG VAULT' : '+ ADD ROM'}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="SEARCH VAULT..."
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#1a1a1a]/5 border-2 border-[#c0bdae] rounded-xl px-4 py-2 text-[11px] font-bold tracking-widest text-[#4a4b52] placeholder:text-[#8c897d] focus:outline-none focus:border-[#a61022]"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c897d]">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                  {(['ALL', 'GBA', 'GBC', 'GB', 'SNES', 'NES'] as const).map(p => (
                    <button key={p} onClick={() => setPlatformFilter(p)} className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest whitespace-nowrap transition-all ${platformFilter === p ? 'bg-[#a61022] text-white shadow-lg' : 'bg-[#c0bdae]/30 text-[#4a4b52]'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pb-2">
                {isScanning ? (
                  <div className="col-span-3 flex justify-center py-8">
                    <div className="w-8 h-8 border-4 border-[#c0bdae] border-t-[#4a4b52] rounded-full animate-spin"></div>
                  </div>
                ) : games.length === 0 ? (
                  <div className="col-span-3 text-center py-8 opacity-50">
                    <Gamepad2 size={28} className="mx-auto mb-2 text-[#555]" />
                    <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Vault is Empty</p>
                  </div>
                ) : (
                  filteredGames.map((game: GameMetadata) => {
                    const history = playHistory[game.id];
                    return (
                      <GameCartridge
                        key={game.id}
                        game={game}
                        history={history}
                        isActive={activeGame?.metadata.id === game.id}
                        className="!w-full !h-auto aspect-[4/5] !pt-2 !px-2 !pb-3"
                        onClick={async () => {
                          try {
                            const fileHandle = await dirHandle?.getFileHandle(game.fileName);
                            const file = await fileHandle?.getFile();
                            if (file) {
                              addLog(`Booting ROM: ${game.fileName}`);
                              setActiveGame({ metadata: game, file });
                              setEmulatorInstance(null);
                              setIsOpen(false);
                            }
                          } catch (err) { console.error(err); }
                        }}
                      />
                    );
                  })
                )}
              </div>
            </div>
          )}

          {mobileTab === 'saves' && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest">Save States</h3>
                <button onClick={handleCreateSave} disabled={!emulatorInstance || !activeGame} className="text-[10px] py-1.5 px-4 bg-[#1a1a1a] text-[#39ff14] border border-[#333] rounded font-bold disabled:opacity-30 disabled:cursor-not-allowed">
                  + SAVE
                </button>
              </div>
              {saveStates.length === 0 ? (
                <div className="text-center py-8 opacity-50">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#555]">No saves found</p>
                  <p className="text-[10px] text-[#555] mt-1">Ensure a game is running first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {saveStates.map((save: SaveStateMetadata) => (
                    <div key={save.id} className="flex justify-between items-center bg-[#f2f2f0] p-3 rounded-lg border border-[#c0bdae] shadow-sm">
                      <div>
                        <p className="text-[11px] font-bold text-[#29225c]">{new Date(save.timestamp).toLocaleDateString()} {new Date(save.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        <p className="text-[9px] text-[#888] uppercase font-bold mt-0.5">ID: {save.id.slice(0, 10)}...</p>
                      </div>
                      <button onClick={() => handleLoadState(save.id)} className="text-[10px] bg-[#1a1a1a] px-3 py-1.5 rounded font-black text-[var(--retro-neon)] border-b-2 border-black active:border-b-0">LOAD</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mobileTab === 'logs' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#39ff14] shadow-[0_0_5px_#39ff14] animate-pulse"></div>
                System Logs
              </h3>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border-2 border-[#333] font-mono text-[11px] text-[#00ff00] leading-relaxed space-y-1">
                {systemLogs.length === 0 ? (
                  <span className="opacity-50 italic">Waiting for events...</span>
                ) : (
                  systemLogs.map((log, i) => (
                    <div key={i} className="break-words">
                      <span className="opacity-50">[{log.time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span> {log.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {mobileTab === 'telemetry' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14] animate-pulse"></div>
                Telemetry
              </h3>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border-2 border-[#333] font-mono text-xs text-[#00ff00]">
                <div className="flex items-end h-16 border-b border-[#333] pb-1 gap-[2px] mb-3">
                  {telemetry.history.map((val, i) => (
                    <div key={i} className={`flex-1 rounded-t transition-all duration-300 ${val > 45 ? 'bg-[var(--retro-neon)]' : val > 0 ? 'bg-[#ffb000]' : 'bg-[#222]'}`} style={{ height: `${Math.max(5, Math.min(100, (val / 60) * 100))}%` }} />
                  ))}
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between"><span className="text-[#888] font-bold">EMULATION FPS:</span><span className={telemetry.fps > 45 ? 'text-[var(--retro-neon)] font-bold' : 'text-[#ffb000] font-bold'}>{activeGame ? telemetry.fps : '--'}</span></div>
                  <div className="flex justify-between"><span className="text-[#888] font-bold">SYS RAM ALLOC:</span><span className="text-[var(--retro-neon)]"> {activeGame ? `${telemetry.ram} MB` : '--'}</span></div>
                  <div className="flex justify-between"><span className="text-[#888] font-bold">VRAM ALLOC:</span><span className="text-[var(--retro-neon)]"> {activeGame ? `${telemetry.vram} MB` : '--'}</span></div>
                  <div className="flex justify-between"><span className="text-[#888] font-bold">TARGET ARCH:</span><span className="text-[var(--retro-neon)]">{activeGame ? (activeGame.metadata.platform === 'GBA' ? 'ARM7TDMI' : activeGame.metadata.platform === 'SNES' ? 'WDC 65C816' : activeGame.metadata.platform === 'NES' ? 'Ricoh 2A03' : 'GENERIC') : 'IDLE'}</span></div>
                </div>
              </div>
            </div>
          )}

          {mobileTab === 'config' && (
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={16} /> Hardware Config
              </h3>
              <label className="flex flex-col gap-2">
                <div className="flex justify-between text-xs font-black uppercase text-[#4a4b52] tracking-wider">
                  <span>AUDIO.VOL</span>
                  <span className="text-[var(--retro-neon)] bg-[#1a1a1a] px-2 py-0.5 rounded font-mono">{Math.round((userSettings?.volume ?? 1) * 100)}%</span>
                </div>
                <div className="px-3 py-2 bg-[#b5b2a3] rounded-lg shadow-inner border border-[#8c897d]">
                  <input type="range" min="0" max="1" step="0.05" value={userSettings?.volume ?? 1} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ volume: parseFloat(e.target.value) })} className="slider-mechanical w-full block" />
                </div>
              </label>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">LCD.THEME</span>
                <div className="relative">
                  <select value={userSettings?.colorTheme || 'arcade-neon'} onChange={(e: ChangeEvent<HTMLSelectElement>) => updateSettings({ colorTheme: e.target.value as UserSettings['colorTheme'] })} className="bg-[#1a1a1a] border-2 border-[#444] text-[var(--retro-neon)] p-2 rounded-md text-xs uppercase font-bold w-full appearance-none pr-8 cursor-pointer">
                    <option value="arcade-neon">Arcade Neon</option>
                    <option value="gameboy-dmg">Gameboy DMG</option>
                    <option value="virtual-boy">Virtual Boy</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#555]">▼</div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">GAME.CTRL</span>
                <button onClick={() => setIsKeyBindingModalOpen(true)} className="w-full bg-[#1a1a1a] text-[var(--retro-neon)] border-2 border-[#444] p-2.5 rounded-md text-xs uppercase font-bold tracking-widest">Configure Mappings</button>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">SHELL.MOD</span>
                <button onClick={() => { setMobileTab('library'); setIsOpen(false); setIsCasingModalOpen(true); }} className="w-full bg-[#a61022] text-white border-[3px] border-[#5a000a] p-2.5 rounded text-xs uppercase font-black tracking-widest shadow">Customize Casing</button>
              </div>
              <div className="flex items-center justify-between bg-[#b5b2a3] p-3 rounded-md border border-[#8c897d]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">DISPLAY.CRT</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.crtFilterEnabled || false} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ crtFilterEnabled: e.target.checked })} />
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between bg-[#b5b2a3] p-3 rounded-md border border-[#8c897d]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">DISPLAY.SCL</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.scanlinesEnabled || false} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ scanlinesEnabled: e.target.checked })} />
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between bg-[#b5b2a3] p-3 rounded-md border border-[#8c897d]">
                <span className="text-xs font-black uppercase text-[#4a4b52] tracking-wider">HAPTIC.FB</span>
                <label className="relative inline-flex items-center cursor-pointer scale-[0.85] origin-right">
                  <input type="checkbox" className="sr-only peer" checked={userSettings?.hapticFeedbackEnabled || false} onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ hapticFeedbackEnabled: e.target.checked })} />
                  <div className="w-14 h-7 bg-[#1a1a1a] shadow-inner rounded-sm peer peer-checked:after:translate-x-7 after:content-[''] after:absolute after:top-[-2px] after:left-[-2px] after:bg-gradient-to-b after:from-[#fff] after:to-[#b8b8b8] after:border-[#333] after:border-x after:border-b-[4px] after:rounded-sm after:h-8 after:w-7 after:transition-all after:shadow-[0_3px_5px_rgba(0,0,0,0.5)]"></div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
