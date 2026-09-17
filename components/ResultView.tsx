"use client";

import React, { useState, useMemo } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  Sparkles,
  Layers,
  Code,
  Music,
  Clock,
  Play,
} from "lucide-react";
import { AnalyzeStats } from "@/lib/types";
import { downloadSrtFile } from "@/lib/download";

interface ResultViewProps {
  srtContent: string;
  filename: string;
  stats?: AnalyzeStats;
  currentAudioTime?: number;
  onSeekAudio?: (timeSec: number) => void;
}

interface ParsedSrtItem {
  index: number;
  startSec: number;
  endSec: number;
  timeStr: string;
  text: string;
  isInstrumental: boolean;
  isVocalStart: boolean;
  cleanText: string;
}

function parseTimestampToSeconds(ts: string): number {
  // HH:MM:SS,mmm
  const parts = ts.trim().split("-->");
  if (!parts[0]) return 0;
  const match = parts[0].trim().match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseInt(match[3], 10);
  const ms = parseInt(match[4], 10);
  return h * 3600 + m * 60 + s + ms / 1000;
}

export const ResultView: React.FC<ResultViewProps> = ({
  srtContent,
  filename,
  stats,
  currentAudioTime = 0,
  onSeekAudio,
}) => {
  const [activeTab, setActiveTab] = useState<"visual" | "raw">("visual");
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  // Parse SRT content into structured items for interactive visual display
  const srtItems = useMemo<ParsedSrtItem[]>(() => {
    if (!srtContent) return [];
    const blocks = srtContent.trim().split(/\n\s*\n/);
    const items: ParsedSrtItem[] = [];

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      if (lines.length >= 2) {
        const index = parseInt(lines[0].trim(), 10) || items.length + 1;
        const timeStr = lines[1].trim();
        const contentLines = lines.slice(2).join("\n");

        const [startPart, endPart] = timeStr.split("-->").map((s) => s.trim());
        const startSec = parseTimestampToSeconds(startPart || "");
        const endSec = parseTimestampToSeconds(endPart || "");

        const isInstrumental =
          contentLines.includes("[INSTRUMENTAL") ||
          contentLines.includes("[MUSIC INTRO") ||
          contentLines.includes("[OUTRO") ||
          contentLines.includes("[BEAT DROP");
        const isVocalStart = contentLines.includes("[VOCAL START]");

        const cleanText = contentLines
          .replace(/\[VOCAL START\]\s*/g, "")
          .trim();

        items.push({
          index,
          startSec,
          endSec,
          timeStr,
          text: contentLines,
          isInstrumental,
          isVocalStart,
          cleanText,
        });
      }
    }
    return items;
  }, [srtContent]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(srtContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy SRT", err);
    }
  };

  const handleDownload = () => {
    downloadSrtFile(srtContent, filename);
  };

  const handleDownloadVtt = () => {
    const vttContent =
      "WEBVTT\n\n" + srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
    downloadSrtFile(vttContent, filename.replace(/\.srt$/i, ".vtt"));
  };

  const handleDownloadTxt = () => {
    const txtContent = srtItems
      .map((item) => `[${item.timeStr}] ${item.cleanText || item.text}`)
      .join("\n");
    downloadSrtFile(txtContent, filename.replace(/\.srt$/i, ".txt"));
  };

  const handleCopyPrompt = async () => {
    const promptText = `Act as an expert AI Video Director & Music Choreographer.
Here is the Master Sync SRT timing data for the song "${filename}":

\`\`\`srt
${srtContent}
\`\`\`

Task:
1. Generate precision scene prompts for every subtitle cue, matching lip-sync and character actions during [VOCAL START] segments.
2. Provide choreography and camera movement during [INSTRUMENTAL | NO VOCAL] sections.
3. Optimize prompts for Runway Gen-3 / Luma Dream Machine / Kling / Sora.`;

    try {
      await navigator.clipboard.writeText(promptText);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy prompt", err);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6 border border-emerald-500/40 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/30 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
            <Check className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white">
                MASTER SYNC SRT READY
              </h3>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                1-Indexed • UTF-8
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5 truncate max-w-sm sm:max-w-md">
              {filename}
            </p>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all border ${
              copied
                ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
                : "bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>✓ COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>COPY SRT</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-gray-950 transition-all shadow-md shadow-emerald-950/40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>DOWNLOAD SRT</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadVtt}
            className="hidden sm:flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700/60 transition"
            title="Download WebVTT format for web players"
          >
            <span>.VTT</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="hidden sm:flex items-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 border border-gray-700/60 transition"
            title="Download Timed Lyrics Text format"
          >
            <span>.TXT</span>
          </button>
        </div>
      </div>

      {/* Audio Engine Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 shadow-inner">
            <span className="text-gray-400 text-[11px] block flex items-center gap-1">
              <Clock className="w-3 h-3 text-emerald-400" /> Song Duration
            </span>
            <span className="font-mono font-bold text-base text-white mt-1 block">
              {stats.duration_seconds.toFixed(1)}s
            </span>
          </div>

          <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 shadow-inner">
            <span className="text-gray-400 text-[11px] block flex items-center gap-1">
              <FileText className="w-3 h-3 text-emerald-400" /> Lyric Lines
            </span>
            <span className="font-mono font-bold text-base text-emerald-400 mt-1 block">
              {stats.lyric_lines} Lines
            </span>
          </div>

          <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 shadow-inner">
            <span className="text-gray-400 text-[11px] block flex items-center gap-1">
              <Music className="w-3 h-3 text-cyan-400" /> Instrumental Gaps
            </span>
            <span className="font-mono font-bold text-base text-cyan-400 mt-1 block">
              {stats.instrumental_gaps} Gaps
            </span>
          </div>

          <div className="bg-black/30 border border-white/[0.06] rounded-xl p-3 shadow-inner">
            <span className="text-gray-400 text-[11px] block flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" /> Total Subtitle Cues
            </span>
            <span className="font-mono font-bold text-base text-purple-300 mt-1 block">
              {stats.total_events} Cues
            </span>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("visual")}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === "visual"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive Timeline Cards ({srtItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("raw")}
            className={`flex items-center gap-2 py-2 px-3.5 text-xs font-bold border-b-2 transition ${
              activeTab === "raw"
                ? "border-emerald-400 text-emerald-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Raw SRT Code</span>
          </button>
        </div>

        <span className="text-[11px] text-gray-500 font-mono hidden sm:inline">
          {activeTab === "visual"
            ? "Click any card to jump audio"
            : "Standard SubRip UTF-8 format"}
        </span>
      </div>

      {/* Tab 1: Interactive Visual Timeline Cards */}
      {activeTab === "visual" && (
        <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
          {srtItems.map((item) => {
            const isCurrentlyActive =
              currentAudioTime >= item.startSec &&
              currentAudioTime <= item.endSec;

            return (
              <div
                key={item.index}
                onClick={() => onSeekAudio && onSeekAudio(item.startSec)}
                className={`p-3.5 rounded-xl border transition-all duration-150 cursor-pointer ${
                  isCurrentlyActive
                    ? "bg-emerald-950/60 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] scale-[1.01]"
                    : item.isInstrumental
                    ? "bg-black/40 border-purple-500/20 hover:border-purple-500/40 text-gray-400"
                    : "bg-black/30 border-white/[0.06] hover:border-emerald-500/30 text-gray-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-white/[0.08] text-gray-300 font-mono text-[10px] font-bold flex items-center justify-center">
                      #{item.index}
                    </span>
                    <span className="font-mono text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {item.timeStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {item.isVocalStart && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                        🎤 Vocal Start
                      </span>
                    )}

                    {item.isInstrumental && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                        🎵 Instrumental
                      </span>
                    )}

                    {isCurrentlyActive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-400 text-gray-950 uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <Play className="w-2.5 h-2.5 fill-current" /> Playing Now
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`text-sm font-semibold pl-7 leading-relaxed ${
                    isCurrentlyActive
                      ? "text-white text-base"
                      : item.isInstrumental
                      ? "text-purple-300/80 font-mono text-xs italic"
                      : "text-gray-200"
                  }`}
                >
                  {item.cleanText || item.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Raw SRT Code Preview */}
      {activeTab === "raw" && (
        <div className="rounded-xl bg-black border border-white/[0.08] overflow-hidden shadow-inner">
          <div className="bg-gray-900/90 px-4 py-2 border-b border-white/[0.06] flex items-center justify-between text-xs text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Standard SubRip format • Millisecond Precision</span>
            </span>
            <span className="text-emerald-400 font-bold">UTF-8 Encoded</span>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs text-emerald-300/90 leading-relaxed whitespace-pre-wrap select-text bg-[#07090e]">
            {srtContent}
          </div>
        </div>
      )}

      {/* AI Video Director Prompt Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-gray-900/80 to-purple-950/30 border border-emerald-500/30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              AI Video Director Prompt
            </h4>
            <p className="text-[11px] text-gray-300 mt-0.5">
              Copy ready-to-paste prompt with your Master SRT for ChatGPT / Claude / Runway / Kling.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyPrompt}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all flex-shrink-0 border ${
            promptCopied
              ? "bg-emerald-600 text-white border-emerald-500 shadow-md"
              : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40"
          }`}
        >
          {promptCopied ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>PROMPT COPIED!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>COPY VIDEO PROMPT</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
