"use client";

import React from "react";
import { Loader2, CheckCircle2, Cpu, Music4, AudioLines, FileCheck } from "lucide-react";
import { ProcessingStage } from "@/lib/types";

interface ProcessingStatusProps {
  currentStage: ProcessingStage;
}

const STAGES: {
  key: ProcessingStage;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "preparing",
    label: "Acoustic Normalization",
    description: "FFmpeg 16kHz mono PCM decoding & duration extraction",
    icon: Cpu,
  },
  {
    key: "aligning",
    label: "Vocal Boundary Detection",
    description: "Multi-pass energy thresholding and syllabic segmentation",
    icon: AudioLines,
  },
  {
    key: "analyzing",
    label: "Macro Music Event Analysis",
    description: "Detecting intros, build-ups, beat drops, and outro transitions",
    icon: Music4,
  },
  {
    key: "gaps",
    label: "Instrumental Gap Pinpointing",
    description: "Marking non-vocal interludes as [INSTRUMENTAL | NO VOCAL]",
    icon: AudioLines,
  },
  {
    key: "generating",
    label: "Master SRT Formatting",
    description: "1-indexed millisecond alignment and UTF-8 verification",
    icon: FileCheck,
  },
];

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  currentStage,
}) => {
  const getStageIndex = (stage: ProcessingStage): number => {
    switch (stage) {
      case "preparing":
        return 0;
      case "aligning":
        return 1;
      case "analyzing":
        return 2;
      case "gaps":
        return 3;
      case "generating":
        return 4;
      case "ready":
        return 5;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(currentStage);
  const progressPercent = Math.min(100, Math.round(((currentIndex + 1) / (STAGES.length + 1)) * 100));

  return (
    <div className="glass-card rounded-2xl p-6 border border-emerald-500/30 shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)] relative overflow-hidden space-y-5">
      {/* Background Animated Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>REAL-TIME ACOUSTIC PIPELINE</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </h3>
            <p className="text-xs text-emerald-400/90 font-mono mt-0.5">
              Decoding waveform & aligning lyrics...
            </p>
          </div>
        </div>

        {/* Dynamic Progress Bar Counter */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-mono text-gray-400">Status</span>
            <p className="text-sm font-bold font-mono text-emerald-400">
              {progressPercent}% Complete
            </p>
          </div>

          {/* Mini Equalizer Bar Animation */}
          <div className="flex items-end gap-1 h-6 bg-black/40 px-2 py-1 rounded-md border border-white/[0.06]">
            <div className="w-1 bg-emerald-400 rounded-full wave-bar-1"></div>
            <div className="w-1 bg-emerald-400 rounded-full wave-bar-3"></div>
            <div className="w-1 bg-emerald-400 rounded-full wave-bar-2"></div>
            <div className="w-1 bg-emerald-400 rounded-full wave-bar-4"></div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-900/80 rounded-full h-2 overflow-hidden border border-white/[0.06]">
        <div
          className="bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 h-full rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      {/* Stages List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {STAGES.map((stage, idx) => {
          const isDone = currentIndex > idx;
          const isActive = currentIndex === idx;
          const Icon = stage.icon;

          return (
            <div
              key={stage.key}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${
                isActive
                  ? "bg-emerald-950/40 border-emerald-500/50 shadow-md text-white scale-[1.01]"
                  : isDone
                  ? "bg-gray-900/40 border-white/[0.06] text-gray-300"
                  : "bg-black/20 border-white/[0.03] text-gray-600 opacity-60"
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isActive ? (
                  <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-700 flex items-center justify-center text-[10px] text-gray-500 font-mono">
                    {idx + 1}
                  </div>
                )}
              </div>

              <div className="overflow-hidden">
                <p
                  className={`text-xs font-bold ${
                    isActive
                      ? "text-emerald-300"
                      : isDone
                      ? "text-gray-200"
                      : "text-gray-500"
                  }`}
                >
                  {stage.label}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                  {stage.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
