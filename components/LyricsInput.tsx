"use client";

import React from "react";
import { AlignLeft, Sparkles, Trash2, Wand2, Type } from "lucide-react";

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
    <div className="glass-card rounded-2xl p-5 sm:p-6 transition-all border border-white/[0.08] shadow-2xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center border border-emerald-500/40 shadow-sm">
            2
          </span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>STEP 2: PASTE SONG LYRICS</span>
              <span className="text-[10px] font-semibold text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                REQUIRED
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-emerald-400 font-semibold">
            {lineCount} lines
          </span>
          <span className="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-gray-400">
            {charCount} chars
          </span>
        </div>
      </div>

      {/* Quick Action Bar for Lyrics */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" /> Samples:
          </span>
          <button
            type="button"
            onClick={() => onChange(SAMPLE_HINDI)}
            disabled={disabled}
            className="text-[11px] font-medium px-2 py-1 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700/60 transition"
          >
            Hindi (हिंदी)
          </button>
          <button
            type="button"
            onClick={() => onChange(SAMPLE_ENGLISH)}
            disabled={disabled}
            className="text-[11px] font-medium px-2 py-1 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700/60 transition"
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
                className="text-[11px] font-medium px-2 py-1 rounded bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700/60 transition flex items-center gap-1"
                title="Remove empty lines and trim spaces"
              >
                <Wand2 className="w-3 h-3 text-emerald-400" />
                <span>Clean Lines</span>
              </button>
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={disabled}
                className="text-[11px] font-medium px-2 py-1 rounded bg-red-950/30 hover:bg-red-900/40 text-red-300 border border-red-900/40 transition flex items-center gap-1"
                title="Clear lyrics"
              >
                <Trash2 className="w-3 h-3" />
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
          className="w-full rounded-xl bg-black/50 border border-white/[0.09] p-4 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition resize-y font-sans leading-relaxed disabled:opacity-50 shadow-inner"
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-400 mt-2.5 px-1 gap-1">
        <div className="flex items-center gap-1.5">
          <AlignLeft className="w-3.5 h-3.5 text-emerald-400" />
          <span>Each line break becomes a synced subtitle card</span>
        </div>
        <span className="text-[11px] text-emerald-400/90 font-mono">
          ✓ Full Unicode & Hindi Devanagari Preserved
        </span>
      </div>
    </div>
  );
};
