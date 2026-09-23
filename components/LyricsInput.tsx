"use client";

import React from "react";
import { AlignLeft, Sparkles, Trash2, Wand2 } from "lucide-react";

interface LyricsInputProps {
  lyrics: string;
  onChange: (lyrics: string) => void;
  disabled?: boolean;
}

const SAMPLE_HINDI = `तेरे बिना जीना मुश्किल है
तुझसे ही मेरी हर सुबह है
दिल की यही दुआ है सदा
तू रहे संग हमेशा मेरे`;

const SAMPLE_ENGLISH = `Every night in my dreams
I see you, I feel you
That is how I know you go on
Far across the distance`;

export const LyricsInput: React.FC<LyricsInputProps> = ({
  lyrics,
  onChange,
  disabled = false,
}) => {
  const lineCount = lyrics
    .split("\n")
    .filter((l) => l.trim().length > 0).length;

  const charCount = lyrics.length;

  const handleCleanEmptyLines = () => {
    const cleaned = lyrics
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join("\n");
    onChange(cleaned);
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 transition-all border border-white/[0.08] shadow-2xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center border border-emerald-500/40 shadow-sm flex-shrink-0">
            2
          </span>
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span>STEP 2: PASTE SONG LYRICS</span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                REQUIRED
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-emerald-400 font-semibold text-[11px] sm:text-xs">
            {lineCount} lines
          </span>
          <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-gray-400 text-[11px] sm:text-xs">
            {charCount} chars
          </span>
        </div>
      </div>

      {/* Quick Action Bar for Lyrics */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-0.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400 flex-shrink-0" /> Samples:
          </span>
          <button
            type="button"
            onClick={() => onChange(SAMPLE_HINDI)}
            disabled={disabled}
            className="text-xs font-medium px-2.5 py-1.5 min-h-[34px] rounded-lg bg-gray-800/80 hover:bg-gray-700 active:bg-gray-600 text-gray-200 border border-gray-700/60 transition touch-manipulation"
          >
            Hindi (हिंदी)
          </button>
          <button
            type="button"
            onClick={() => onChange(SAMPLE_ENGLISH)}
            disabled={disabled}
            className="text-xs font-medium px-2.5 py-1.5 min-h-[34px] rounded-lg bg-gray-800/80 hover:bg-gray-700 active:bg-gray-600 text-gray-200 border border-gray-700/60 transition touch-manipulation"
          >
            English
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {lyrics.trim().length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCleanEmptyLines}
                disabled={disabled}
                className="text-xs font-medium px-2.5 py-1.5 min-h-[34px] rounded-lg bg-gray-800/80 hover:bg-gray-700 active:bg-gray-600 text-gray-200 border border-gray-700/60 transition flex items-center gap-1 touch-manipulation"
                title="Remove empty lines and trim spaces"
              >
                <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Clean</span>
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={disabled}
                className="text-xs font-medium px-2.5 py-1.5 min-h-[34px] rounded-lg bg-red-950/30 hover:bg-red-900/40 active:bg-red-800/50 text-red-300 border border-red-900/40 transition flex items-center gap-1 touch-manipulation"
                title="Clear lyrics"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative">
        <textarea
          value={lyrics}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={`Paste your original song lyrics line-by-line here...

Supports Hindi (Devanagari), Hinglish, English, or mixed languages.
Example:
तेरे बिना जीना मुश्किल है
तुझसे ही मेरी हर सुबह है

No timestamps needed! The audio AI aligns timing to the vocal waveform automatically.`}
          rows={7}
          className="w-full rounded-xl bg-black/50 border border-white/[0.09] p-3.5 sm:p-4 text-base sm:text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition resize-y font-sans leading-relaxed disabled:opacity-50 shadow-inner"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-400 mt-2 px-0.5 gap-1">
        <div className="flex items-center gap-1.5">
          <AlignLeft className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span>Each line break becomes a synced subtitle card</span>
        </div>
        <span className="text-[11px] text-emerald-400/90 font-mono">
          ✓ Full Unicode & Hindi Devanagari Preserved
        </span>
      </div>
    </div>
  );
};
