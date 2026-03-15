import React from 'react';
import { Card } from '@retrovault/ui';


interface SystemLogsProps {
  logs: { time: Date; message: string }[];
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ logs }) => {
  return (
    <Card className="flex flex-col h-[180px] shrink-0 p-4 !rounded-xl !border-[0] shadow-[0_10px_30px_rgba(0,0,0,0.3),inset_0_2px_5px_rgba(255,255,255,0.8)] bg-[#e0ddcf] relative overflow-hidden">
      {/* Background wireframe accent */}
      <div className="absolute -right-10 -top-10 text-[#c0bdae] opacity-30 pointer-events-none">
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
      </div>

      <div className="flex justify-between items-center border-b-[3px] border-[#c0bdae] pb-2 relative z-10 shrink-0 mb-3">
        <h3 className="text-sm font-black text-[#4a4b52] uppercase tracking-widest flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14] animate-pulse"></div>
          System Logs
        </h3>
      </div>

      <div className="flex-1 min-h-0 bg-[#1a1a1a] rounded-lg p-3 border-2 border-[#333] shadow-inner font-mono text-[10px] sm:text-xs text-[#00ff00] leading-normal relative overflow-y-auto custom-scrollbar z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20"></div>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#00ff00]/30 italic">
            <span className="animate-pulse">WAITING_FOR_SYSTEM_INIT...</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 group">
                <span className="text-[#888] shrink-0 font-bold">[{log.time.toLocaleTimeString([], { hour12: false })}]</span>
                <span className="break-all border-l border-[#333] pl-2 group-hover:text-white transition-colors">{log.message}</span>
              </div>
            ))}
            <div className="flex gap-2 text-[#00ff00]/50 italic">
              <span>[SYSTEM]</span>
              <span>READY_FOR_COMMAND_INPUT_</span>
              <span className="w-2 h-4 bg-[#00ff00] animate-pulse ml-0.5"></span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
