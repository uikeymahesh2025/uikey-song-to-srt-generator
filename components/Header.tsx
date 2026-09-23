"use client";

import React from "react";
import { Music2, Sparkles, ShieldCheck } from "lucide-react";

interface HeaderProps {
  onLoadDemo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLoadDemo }) => {
  return (
    <header className="border-b border-white/[0.08] bg-[#090d14]/90 backdrop-blur-xl sticky top-0 z-30 shadow-lg">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3.5 w-full sm:w-auto">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-emerald-500/30 via-emerald-600/10 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              <Music2 className="w-5 h-5" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#090d14] flex items-center justify-center animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>

          <div className="min-w-0 flex-1 sm:flex-initial">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-[11px] font-extrabold tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase shadow-sm">
                UIKEY AI
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-400/90 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                STUDIO v1.2
              </span>
            </div>
            <h1 className="text-xs sm:text-base md:text-lg font-extrabold tracking-tight text-white mt-0.5 truncate sm:overflow-visible">
              SONG TO SRT MASTER GENERATOR
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          {onLoadDemo && (
            <button
              type="button"
              onClick={onLoadDemo}
              className="flex items-center justify-center gap-1.5 px-3 py-2 min-h-[40px] text-xs font-bold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:bg-emerald-500/35 text-emerald-300 border border-emerald-500/30 transition shadow-sm touch-manipulation w-full sm:w-auto"
              title="Click to load a sample song and lyrics instantly"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span>⚡ Load Demo Song</span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-400 bg-gray-900/80 px-3 py-1.5 rounded-lg border border-white/[0.08]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Private • Ephemeral</span>
          </div>
        </div>
      </div>
    </header>
  );
};
