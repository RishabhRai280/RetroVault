import React from 'react';
import type { SyntheticEvent } from 'react';
import type { GameMetadata } from '@retrovault/core';
import type { PlayHistory } from '@retrovault/db';

interface GameCartridgeProps {
  game: GameMetadata;
  history?: PlayHistory;
  isActive: boolean;
  onClick: (game: GameMetadata) => void;
  className?: string;
}

export const GameCartridge: React.FC<GameCartridgeProps> = ({
  game,
  history,
  isActive,
  onClick,
  className = '',
}) => {
  return (
    <div
      title={game.description ? `${game.title}\n\n${game.description}` : game.title}
      onClick={() => onClick(game)}
      className={`relative w-[130px] h-[145px] shrink-0 bg-[#b5b5b5] rounded-t-xl rounded-b-sm border-2 border-[#8c8c8c] border-b-[6px] shadow-[0_8px_15px_rgba(0,0,0,0.3),inset_0_4px_6px_rgba(255,255,255,0.6),inset_-2px_-4px_6px_rgba(0,0,0,0.3)] cursor-pointer hover:shadow-[0_15px_25px_rgba(0,0,0,0.5)] transition-all duration-300 flex flex-col pt-2 px-2 pb-3 texture-plastic group ${isActive ? 'shadow-[0_15px_25px_rgba(0,0,0,0.5)] border-[#a61022] ring-2 ring-[#a61022]' : ''} ${className}`}
    >
      {/* Top Physical Grooves (Cartridge Grip) */}
      <div className="absolute top-0 left-0 right-0 h-4 flex justify-between px-4 opacity-50">
        <div className="flex gap-1.5 h-full pt-1">
          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner"></div>
          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner"></div>
          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner hidden sm:block"></div>
        </div>
        <div className="flex gap-1.5 h-full pt-1">
          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner hidden sm:block"></div>
          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner"></div>
          <div className="w-2 h-full bg-[#8c8c8c] rounded-b-sm shadow-inner"></div>
        </div>
      </div>

      {/* Direction Arrow Engraving */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-transparent border-t-[#8c8c8c] opacity-60 shadow-[0_1px_0_rgba(255,255,255,0.4)]"></div>

      {/* Playtime Badge */}
      <div className="absolute top-1 right-1 bg-black/80 px-1 py-0.5 rounded shadow-inner flex items-center gap-1 z-30 ring-1 ring-[#555]">
        <div className={`w-1.5 h-1.5 rounded-full ${history?.timePlayedSeconds ? 'bg-[#ffb000]' : 'bg-[#39ff14] animate-pulse shadow-[0_0_5px_#39ff14]'}`}></div>
        <span className="text-[7px] font-black tracking-widest text-[#e0ddcf] uppercase tabular-nums">
          {history?.timePlayedSeconds ? `${Math.floor(history.timePlayedSeconds / 60)}m` : 'NEW'}
        </span>
      </div>

      {/* Recessed Sticker Area */}
      <div className="mt-8 flex-1 bg-[#8c8c8c] rounded border border-[#7a7a7a] shadow-[inset_0_4px_8px_rgba(0,0,0,0.5)] p-0.5 relative overflow-hidden">
        {/* The glossy physical sticker */}
        <div className="w-full h-full bg-[#e0ddcf] rounded-sm relative overflow-hidden flex flex-col shadow-[0_1px_2px_rgba(255,255,255,0.5)] group">
          {/* Clean Minimalist Background */}
          <div className="absolute inset-0 flex flex-col items-center justify-start bg-[#f2f2f0] px-2 pt-4 pb-2 text-center">
            <span className="font-black text-[10px] sm:text-[11px] text-[#333] tracking-widest uppercase leading-tight w-full pointer-events-none border-b-2 border-[#ddd] pb-2 mb-2">
              {(game.title || game.fileName).replace(/\.(gba|smc|nes|gb|gbc)$/i, '')}
            </span>
          </div>

          {/* External Box Art */}
          {game.boxArtUrl && (
            <img
              src={game.boxArtUrl}
              alt={`${game.title || game.fileName} Box Art`}
              className="absolute inset-0 w-full h-full object-cover pixelated opacity-95 group-hover:scale-110 transition-transform duration-700 z-10 bg-[#e0ddcf]"
              loading="lazy"
              onError={(e: SyntheticEvent<HTMLImageElement, Event>) => { e.currentTarget.style.display = 'none'; }}
            />
          )}

          {/* Authentic Title Footer */}
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 px-2 flex justify-between items-center z-20 border-t-2 border-[#a61022] shadow-[0_-2px_5px_rgba(0,0,0,0.3)]">
            <span className="font-black text-[8px] uppercase tracking-widest text-[#222] truncate">{game.platform} GAME PAK</span>
            <span className="font-black text-[6px] text-[#a61022] border border-[#a61022] px-0.5 rounded-sm tabular-nums tracking-widest">{game.releaseYear || 'SYS'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
