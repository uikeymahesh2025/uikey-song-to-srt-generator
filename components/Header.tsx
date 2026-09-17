"use client";

import React from "react";
import { Music2, Sparkles, ShieldCheck, Zap } from "lucide-react";

interface HeaderProps {
  onLoadDemo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLoadDemo }) => {
  return (
    <header className="border-b border-white/[0.08] bg-[#090d14]/80 backdrop-blur-xl sticky top-0 z-30 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/30 via-emerald-600/10 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
              <Music2 className="w-5 h-5" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#090d14] flex items-center justify-center animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold tracking-widest px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase shadow-sm">
                UIKEY AI
              </span>
              <span className="text-[11px] font-semibold text-emerald-400/90 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
                STUDIO v1.2
              </span>
            </div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white mt-0.5 flex items-center gap-1.5">
              SONG TO SRT MASTER GENERATOR
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {onLoadDemo && (
            <button
              type="button"
              onClick={onLoadDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition shadow-sm hover:shadow-emerald-950/30"
              title="Click to load a sample song and lyrics instantly"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
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
