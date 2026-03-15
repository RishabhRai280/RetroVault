import React from 'react';
import type { GameMetadata } from '@retrovault/core';
import type { UserSettings, CasingTheme } from '@retrovault/db';
import type { Nostalgist } from 'nostalgist';
import { EmulatorConsole } from './EmulatorConsole';
import { getCasingClasses, getCasingStyles } from '../Casing/CasingUtils';

interface GameBoyShellProps {
  activeGame: { metadata: GameMetadata, file: File } | null;
  currentCasing: CasingTheme;
  consoleScale: number;
  userSettings: UserSettings | null;
  simulateKeyDown: (key: string) => void;
  simulateKeyUp: (key: string) => void;
  simulateKeyboardEvent: (key: string, isDown: boolean) => void;
  handleCloseEmulator: () => void;
  setEmulatorInstance: (instance: Nostalgist | null) => void;
  addLog: (message: string) => void;
}

export const GameBoyShell: React.FC<GameBoyShellProps> = ({
  activeGame,
  currentCasing,
  consoleScale,
  userSettings,
  simulateKeyDown,
  simulateKeyUp,
  simulateKeyboardEvent,
  handleCloseEmulator,
  setEmulatorInstance,
  addLog,
}) => {
  return (
    <div
      className={`w-[490px] h-[860px] shrink-0 rounded-tl-xl rounded-tr-xl rounded-bl-2xl rounded-br-[7rem] pt-8 pb-8 px-6 flex flex-col items-center shadow-[30px_40px_60px_rgba(0,0,0,0.6),inset_-5px_-5px_20px_rgba(0,0,0,0.1),inset_5px_5px_15px_rgba(255,255,255,0.9)] border-r-8 border-b-[12px] border-[#a3a193] relative origin-center z-10 texture-plastic overflow-hidden ${getCasingClasses(currentCasing)}`}
      style={{
        ...getCasingStyles(currentCasing),
        transform: `scale(${consoleScale})`,
        marginBlock: `${(consoleScale - 1) * 430}px`,
        marginInline: `${(consoleScale - 1) * 245}px`,
      }}
    >
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiAvPgo8cmVjdCB3aWR0aD0iMSIgaGVpZ2h0PSIxIiBmaWxsPSIjMDAwIiAvPjwvc3ZnPg==')] mix-blend-multiply z-0"></div>

      {/* Top Area Hardware Details */}
      <div className="absolute top-0 left-0 w-full z-10">
        <div className="w-full h-2 border-b-2 border-t-2 border-[#b5b3a6] shadow-[0_1px_1px_rgba(255,255,255,0.8)] opacity-70"></div>
        <div className="absolute top-0 left-[70px] w-[90px] h-[16px] bg-[#a8a699] rounded-b-md shadow-[inset_0_2px_5px_rgba(0,0,0,0.4),0_1px_1px_rgba(255,255,255,0.8)] flex justify-center pb-1 items-end">
          <div className="w-14 h-2.5 bg-[#6b6a62] rounded-b-sm shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)] flex justify-evenly items-center px-1">
            <div className="w-[1.5px] h-2 bg-[#333]"></div>
            <div className="w-[1.5px] h-2 bg-[#333]"></div>
            <div className="w-[1.5px] h-2 bg-[#333]"></div>
            <div className="w-[1.5px] h-2 bg-[#333]"></div>
          </div>
        </div>

        {/* Hardware Rewind/FF Module */}
        {activeGame && (
          <div className="absolute top-[16px] right-12 z-20">
            {/* Recessed Pill Channel */}
            <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full shadow-[inset_2px_3px_5px_rgba(0,0,0,0.4),0_1px_-1px_rgba(255,255,255,0.3)] border border-black/10 transition-all duration-500 ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'bg-[#b6b4a7]' : 'bg-black/30 backdrop-blur-[2px]'}`}>
              
              {/* Rewind Button */}
              <button
                onPointerDown={() => simulateKeyboardEvent('Backspace', true)}
                onPointerUp={() => simulateKeyboardEvent('Backspace', false)}
                onPointerOut={() => simulateKeyboardEvent('Backspace', false)}
                className="group relative w-7 h-7 flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-[#2a2a2a] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.1)] border-b-2 border-black group-active:translate-y-[1px] group-active:shadow-none transition-all cursor-pointer overflow-hidden">
                  {/* Material Texture */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]"></div>
                </div>
                <div className="relative z-10 flex gap-[1px] opacity-40 group-hover:opacity-60 transition-opacity">
                  <div className="w-1 h-2 border-r-[1.5px] border-t-[1.5px] border-white rotate-[225deg]"></div>
                  <div className="w-1 h-2 border-r-[1.5px] border-t-[1.5px] border-white rotate-[225deg]"></div>
                </div>
              </button>

              {/* Fast Forward Button */}
              <button
                onPointerDown={() => simulateKeyboardEvent('Space', true)}
                onPointerUp={() => simulateKeyboardEvent('Space', false)}
                onPointerOut={() => simulateKeyboardEvent('Space', false)}
                className="group relative w-7 h-7 flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-[#2a2a2a] rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.6),inset_1px_1px_2px_rgba(255,255,255,0.1)] border-b-2 border-black group-active:translate-y-[1px] group-active:shadow-none transition-all cursor-pointer overflow-hidden">
                  {/* Material Texture */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]"></div>
                </div>
                <div className="relative z-10 flex gap-[1px] opacity-40 group-hover:opacity-60 transition-opacity">
                  <div className="w-1 h-2 border-r-[1.5px] border-t-[1.5px] border-white rotate-[45deg]"></div>
                  <div className="w-1 h-2 border-r-[1.5px] border-t-[1.5px] border-white rotate-[45deg]"></div>
                </div>
              </button>
              
            </div>
          </div>
        )}
      </div>

      {/* Exact DMG Screen Bezel */}
      <div className="w-[95%] h-[420px] bg-gradient-to-b from-[#5c5d66] to-[#45464d] rounded-t-xl rounded-b-[4.5rem] p-6 shadow-[inset_0_8px_20px_rgba(0,0,0,0.6),0_2px_2px_rgba(255,255,255,0.6)] border-b-[3px] border-r-[2px] border-[#333] relative z-10 mt-8 shrink-0">
        
        {/* Bezel Decorative Lines & Text */}
        <div className="w-[95%] mx-auto flex flex-col items-center mb-6 relative top-1 gap-2">
          <div className="w-full flex items-center justify-center gap-3">
            <div className="flex-1 h-[3px] bg-[#751125] shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"></div>
            <span className="text-[7.5px] text-[#b8b8b8] font-black tracking-[0.25em] z-10 px-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] uppercase whitespace-nowrap">RETROVAULT • HIGH FIDELITY</span>
            <div className="flex-1 h-[3px] bg-[#751125] shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"></div>
          </div>
          <div className="w-full flex items-center justify-center gap-3 opacity-80">
            <div className="flex-1 h-[3px] bg-[#161c5c] shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"></div>
            <div className="w-[160px] h-0"></div> {/* Match text width roughly */}
            <div className="flex-1 h-[3px] bg-[#161c5c] shadow-[inset_0_1px_1px_rgba(0,0,0,0.3)]"></div>
          </div>
        </div>

        {/* Actual Screen Content */}
        <div id="emulator-view" className="mx-auto mt-1 w-[320px] h-[300px] bg-[#8bac0f] border-[6px] border-[#111] shadow-[inset_0_0_20px_rgba(0,0,0,0.5),0_1px_1px_rgba(255,255,255,0.2)] relative overflow-hidden ring-1 ring-[#555] rounded-sm">
          <div className="absolute inset-0 opacity-[0.15] bg-[linear-gradient(rgba(0,0,0,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.5)_1px,transparent_1px)] bg-[size:3px_3px] pointer-events-none z-10"></div>
          <div className="absolute inset-0 shadow-[inset_5px_5px_15px_rgba(0,0,0,0.3)] pointer-events-none z-20"></div>
          <div className="absolute -top-16 -left-16 w-[200%] h-[200%] bg-gradient-to-br from-white/10 to-transparent rotate-45 transform pointer-events-none z-30"></div>
          <EmulatorConsole
            gameId={activeGame?.metadata.id || ''}
            gameTitle={activeGame?.metadata.title || ''}
            romFile={activeGame?.file || null}
            platform={activeGame?.metadata.platform || 'UNKNOWN'}
            volume={userSettings?.volume !== undefined ? userSettings.volume : 1}
            keyBindings={userSettings?.keyBindings}
            onClose={handleCloseEmulator}
            onReady={setEmulatorInstance}
            onLog={addLog}
          />
        </div>
      </div>

      {/* Authentic Logo */}
      <div className="w-full pl-10 mt-6 flex items-baseline gap-2 z-10 relative opacity-90 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
        <span className={`font-bold text-lg tracking-widest ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'text-[#2b2270]' : 'text-current grayscale contrast-200'}`}>Nintendo</span>
        <span className={`font-black italic text-2xl font-serif ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'text-[#2b2270]' : 'text-current grayscale contrast-200'}`}>GAME BOY</span>
        <span className={`font-bold text-[8px] -ml-1 align-top mt-2 ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'text-[#2b2270]' : 'text-current grayscale contrast-200'}`}>TM</span>
      </div>

      {/* Console Bottom Area (Controls & Speakers) */}
      <div className="w-full flex-1 flex flex-col relative px-8 mt-4">

        {/* Row 1: D-Pad and Action Buttons */}
        <div className="flex justify-between items-center w-full mt-4">

          {/* Exact DMG D-PAD */}
          <div className="relative w-36 h-36 flex items-center justify-center select-none">
            {/* D-Pad Base Circle Recess */}
            <div className={`absolute w-36 h-36 rounded-full shadow-[inset_2px_2px_8px_rgba(0,0,0,0.25),inset_-2px_-2px_6px_rgba(255,255,255,0.8)] filter blur-[0.5px] ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'bg-gradient-to-br from-[#c8c6ba] to-[#dedcd1]' : 'bg-black/15'}`}></div>
            
            <div className="relative w-[130px] h-[130px] flex items-center justify-center">
              {/* Vertical Arm */}
              <div className="absolute w-[42px] h-[125px] bg-[#1c1c1c] rounded-md shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_1px_2px_2px_rgba(255,255,255,0.15),inset_-1px_-2px_2px_rgba(0,0,0,0.8)] border-b-[5px] border-r border-[#0a0a0a] flex flex-col justify-between py-3 items-center z-10">
                <div className="w-[24px] flex flex-col gap-1.5 opacity-20"><div className="h-0.5 bg-white rounded-full"></div><div className="h-0.5 bg-white rounded-full"></div><div className="h-0.5 bg-white rounded-full"></div></div>
                <div className="w-[24px] flex flex-col gap-1.5 opacity-20"><div className="h-0.5 bg-white rounded-full"></div><div className="h-0.5 bg-white rounded-full"></div><div className="h-0.5 bg-white rounded-full"></div></div>
              </div>
              {/* Horizontal Arm */}
              <div className="absolute w-[125px] h-[42px] bg-[#1c1c1c] rounded-md shadow-[0_6px_12px_rgba(0,0,0,0.5),inset_1px_2px_2px_rgba(255,255,255,0.15),inset_-1px_-2px_2px_rgba(0,0,0,0.8)] border-b-[5px] border-r border-[#0a0a0a] flex justify-between px-3 items-center z-10">
                 <div className="h-[24px] flex gap-1.5 opacity-20"><div className="w-0.5 bg-white rounded-full"></div><div className="w-0.5 bg-white rounded-full"></div><div className="w-0.5 bg-white rounded-full"></div></div>
                 <div className="h-[24px] flex gap-1.5 opacity-20"><div className="w-0.5 bg-white rounded-full"></div><div className="w-0.5 bg-white rounded-full"></div><div className="w-0.5 bg-white rounded-full"></div></div>
              </div>
              {/* Center Indent */}
              <div className="absolute w-[28px] h-[28px] bg-gradient-to-br from-[#111] to-[#222] rounded-full shadow-[inset_1px_1px_4px_rgba(0,0,0,0.9)] z-20"></div>

              {/* Invisible Hit Zones */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[42px] h-[55px] z-30 cursor-pointer" onPointerDown={() => simulateKeyDown('up')} onPointerUp={() => simulateKeyUp('up')} onPointerOut={() => simulateKeyUp('up')} />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[42px] h-[55px] z-30 cursor-pointer" onPointerDown={() => simulateKeyDown('down')} onPointerUp={() => simulateKeyUp('down')} onPointerOut={() => simulateKeyUp('down')} />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[42px] w-[55px] z-30 cursor-pointer" onPointerDown={() => simulateKeyDown('left')} onPointerUp={() => simulateKeyUp('left')} onPointerOut={() => simulateKeyUp('left')} />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[42px] w-[55px] z-30 cursor-pointer" onPointerDown={() => simulateKeyDown('right')} onPointerUp={() => simulateKeyUp('right')} onPointerOut={() => simulateKeyUp('right')} />
            </div>
          </div>

          {/* Exact A / B Buttons */}
          <div className="relative w-[155px] h-[75px] mr-2">
            {/* Indentation Pill background */}
            <div className={`absolute inset-0 rounded-[3rem] shadow-[inset_1px_2px_5px_rgba(0,0,0,0.25),inset_-1px_-1px_3px_rgba(255,255,255,0.9)] transform -rotate-[25deg] scale-105 ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'bg-gradient-to-br from-[#c2c0b4] to-[#dedcd1]' : 'bg-black/15'}`}></div>

            <div className="absolute inset-0 flex justify-between items-center px-[4px] transform -rotate-[25deg] z-10 transition-all">
              {/* B Button */}
              <div className="flex flex-col items-center relative group select-none">
                <div
                  className="w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#d61e6d] to-[#750737] shadow-[0_5px_8px_rgba(0,0,0,0.5),inset_2px_3px_5px_rgba(255,150,180,0.5),inset_-2px_-4px_6px_rgba(0,0,0,0.6)] border-b-[5px] border-r-[2px] border-[#4a0221] group-active:border-b-0 group-active:border-r-0 group-active:translate-y-[5px] group-active:translate-x-[2px] transition-all cursor-pointer"
                  onPointerDown={() => simulateKeyDown('b')}
                  onPointerUp={() => simulateKeyUp('b')}
                  onPointerOut={() => simulateKeyUp('b')}
                ></div>
                <span className="text-[#2b2270] font-bold tracking-widest mt-1 text-[13px] absolute -bottom-8 -right-1 opacity-90 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] pointer-events-none">B</span>
              </div>

              {/* A Button */}
              <div className="flex flex-col items-center relative group select-none">
                <div
                  className="w-[54px] h-[54px] rounded-full bg-gradient-to-br from-[#d61e6d] to-[#750737] shadow-[0_5px_8px_rgba(0,0,0,0.5),inset_2px_3px_5px_rgba(255,150,180,0.5),inset_-2px_-4px_6px_rgba(0,0,0,0.6)] border-b-[5px] border-r-[2px] border-[#4a0221] group-active:border-b-0 group-active:border-r-0 group-active:translate-y-[5px] group-active:translate-x-[2px] transition-all cursor-pointer"
                  onPointerDown={() => simulateKeyDown('a')}
                  onPointerUp={() => simulateKeyUp('a')}
                  onPointerOut={() => simulateKeyUp('a')}
                ></div>
                <span className="text-[#2b2270] font-bold tracking-widest mt-1 text-[13px] absolute -bottom-8 -right-1 opacity-90 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] pointer-events-none">A</span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Select/Start and Speaker Grill */}
        <div className="w-full flex justify-between items-end mt-auto pb-10">

          {/* Select / Start Rubber Pills */}
          <div className="flex gap-10 transform -rotate-[22deg] mb-12 ml-4">
            {/* Select */}
            <div className="flex flex-col items-center gap-1 group pb-2">
              <div
                className="w-[55px] h-[18px] bg-[#9ca0a6] rounded-full shadow-[inset_1px_2px_3px_rgba(255,255,255,0.3),inset_-1px_-2px_3px_rgba(0,0,0,0.4),0_3px_4px_rgba(0,0,0,0.4)] border-b-[3px] border-[#555] active:border-b-0 active:translate-y-[3px] transition-all cursor-pointer"
                onPointerDown={() => simulateKeyDown('select')}
                onPointerUp={() => simulateKeyUp('select')}
                onPointerOut={() => simulateKeyUp('select')}
              ></div>
              <span className="text-[#2b2270] font-bold text-[10px] tracking-[0.2em] mt-1 opacity-90 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] pointer-events-none">SELECT</span>
            </div>

            {/* Start */}
            <div className="flex flex-col items-center gap-1 group pb-2">
              <div
                className="w-[55px] h-[18px] bg-[#9ca0a6] rounded-full shadow-[inset_1px_2px_3px_rgba(255,255,255,0.3),inset_-1px_-2px_3px_rgba(0,0,0,0.4),0_3px_4px_rgba(0,0,0,0.4)] border-b-[3px] border-[#555] active:border-b-0 active:translate-y-[3px] transition-all cursor-pointer"
                onPointerDown={() => simulateKeyDown('start')}
                onPointerUp={() => simulateKeyUp('start')}
                onPointerOut={() => simulateKeyUp('start')}
              ></div>
              <span className="text-[#2b2270] font-bold text-[10px] tracking-[0.2em] mt-1 opacity-90 drop-shadow-[0_1px_0_rgba(255,255,255,0.5)] pointer-events-none">START</span>
            </div>
          </div>

          {/* Speaker Grill */}
          <div className="flex gap-2.5 transform -rotate-[22deg] mb-8 mr-2 opacity-90">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={`w-2.5 h-[80px] rounded-full shadow-[inset_3px_3px_6px_rgba(0,0,0,0.5),1px_1px_1px_rgba(255,255,255,0.7)] ${currentCasing.type === 'classic' && currentCasing.classicId === 'plastic-gray' ? 'bg-[#a8a699]' : 'bg-black/15'}`}
              ></div>
            ))}
          </div>
        </div>

        {/* Phones Jack */}
        <div className="absolute bottom-2 left-0 w-full flex justify-center items-center text-[#888] text-[9px] gap-1 font-bold font-sans drop-shadow-[0_1px_0_rgba(255,255,255,0.6)] opacity-70">
          <div className="w-3 h-3 border-[1.5px] border-[#888] rounded-full border-b-0 rounded-b-none mb-0.5"></div>
        </div>
      </div>
    </div>
  );
};
