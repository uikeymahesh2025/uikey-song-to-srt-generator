"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { AudioUploader } from "@/components/AudioUploader";
import { LyricsInput } from "@/components/LyricsInput";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { ResultView } from "@/components/ResultView";
import { ProcessingStage, AnalyzeResponse } from "@/lib/types";
import { analyzeSong } from "@/lib/api";
import { createDemoAudioFile, DEMO_LYRICS } from "@/lib/demoAudio";
import { Wand2, AlertCircle, Sparkles, RefreshCw } from "lucide-react";

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lyrics, setLyrics] = useState<string>("");
  const [stage, setStage] = useState<ProcessingStage>("idle");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentAudioTime, setCurrentAudioTime] = useState<number>(0);

  const canGenerate =
    Boolean(audioFile) &&
    lyrics.trim().length > 0 &&
    (stage === "idle" || stage === "ready" || stage === "error");

  const isProcessing =
    stage !== "idle" && stage !== "ready" && stage !== "error";

  const handleLoadDemo = () => {
    try {
      const demoFile = createDemoAudioFile();
      setAudioFile(demoFile);
      setLyrics(DEMO_LYRICS);
      setErrorMsg(null);
      setResult(null);
      setStage("idle");
    } catch (err) {
      console.error("Failed to generate demo audio", err);
    }
  };

  const handleGenerate = async () => {
    if (!audioFile || !lyrics.trim() || isProcessing) return;

    setErrorMsg(null);
    setResult(null);

    // Realistic step transitions during acoustic processing
    setStage("preparing");
    const t1 = setTimeout(() => setStage("aligning"), 1500);
    const t2 = setTimeout(() => setStage("analyzing"), 3200);
    const t3 = setTimeout(() => setStage("gaps"), 4800);
    const t4 = setTimeout(() => setStage("generating"), 6200);

    try {
      const response = await analyzeSong(audioFile, lyrics);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);

      setStage("ready");
      setResult(response);
    } catch (err: unknown) {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);

      setStage("error");
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("An unexpected error occurred during audio processing.");
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col cyber-bg text-gray-100">
      <Header onLoadDemo={handleLoadDemo} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-7">
        {/* Hero Banner with Quick Stats & Demo CTA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#0e131d]/90 to-cyan-950/20 border border-white/[0.08] shadow-xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Acoustic AI Alignment Engine
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              Generate Master Sync SRTs with Millisecond Vocal Precision
            </h2>
            <p className="text-xs text-gray-400 mt-1 max-w-2xl">
              Detects true vocal boundaries, marks instrumental gaps with{" "}
              <code className="text-purple-300 font-mono text-[11px] bg-purple-950/50 px-1 py-0.5 rounded border border-purple-800/40">
                [INSTRUMENTAL | NO VOCAL]
              </code>
              , and preserves full Hindi Devanagari Unicode.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadDemo}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition shadow-sm hover:shadow-emerald-950/40 flex-shrink-0"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>⚡ Try 1-Click Demo</span>
          </button>
        </div>

        {/* Step 1: Upload Song Audio */}
        <AudioUploader
          selectedFile={audioFile}
          onFileSelect={setAudioFile}
          disabled={isProcessing}
          onLoadDemo={handleLoadDemo}
          onTimeUpdate={(time) => setCurrentAudioTime(time)}
        />

        {/* Step 2: Paste Original Lyrics */}
        <LyricsInput
          lyrics={lyrics}
          onChange={setLyrics}
          disabled={isProcessing}
        />

        {/* Step 3: Generate Master SRT Action Card */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.08] shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center border border-emerald-500/40 shadow-sm">
                3
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                STEP 3: GENERATE MASTER SYNC SRT
              </h2>
            </div>

            <span className="text-xs font-mono text-gray-400">
              {audioFile && lyrics.trim().length > 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  ✓ Ready to Generate
                </span>
              ) : (
                "Awaiting audio & lyrics"
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate || isProcessing}
            className={`w-full py-4 px-6 rounded-xl font-extrabold text-sm tracking-wider uppercase flex items-center justify-center gap-3 transition-all duration-200 shadow-xl ${
              canGenerate && !isProcessing
                ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-gray-950 cursor-pointer shadow-emerald-950/50 hover:scale-[1.008]"
                : "bg-gray-800/80 text-gray-500 cursor-not-allowed border border-white/[0.05]"
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-gray-950" />
                <span>PROCESSING AUDIO & LYRICS...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5" />
                <span>GENERATE MASTER SRT FILE</span>
              </>
            )}
          </button>

          {!audioFile && lyrics.trim().length === 0 && (
            <p className="text-xs text-gray-400 text-center">
              Please upload a song audio file (Step 1) and paste lyrics (Step 2) to start, or click{" "}
              <button
                type="button"
                onClick={handleLoadDemo}
                className="text-emerald-400 underline font-semibold hover:text-emerald-300"
              >
                Try 1-Click Demo
              </button>
            </p>
          )}
        </div>

        {/* Error Alert Box */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-800/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 text-red-200 text-sm shadow-xl animate-shake">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-red-100">Processing Error</p>
              <p className="text-xs text-red-300/90 leading-relaxed">{errorMsg}</p>
              <button
                type="button"
                onClick={handleGenerate}
                className="mt-2 text-xs font-bold px-3 py-1 rounded bg-red-900/50 hover:bg-red-800/60 text-white border border-red-700/60 transition inline-block"
              >
                Retry Generation
              </button>
            </div>
          </div>
        )}

        {/* Real-time Processing Animation Tracker */}
        {isProcessing && <ProcessingStatus currentStage={stage} />}

        {/* Result View with Interactive Subtitle Cards & Live Audio Sync */}
        {result && stage === "ready" && (
          <ResultView
            srtContent={result.srt}
            filename={result.filename}
            stats={result.stats}
            currentAudioTime={currentAudioTime}
          />
        )}
      </main>

      {/* Studio Footer */}
      <footer className="border-t border-white/[0.06] bg-[#05070a]/90 py-6 mt-16 text-center text-xs text-gray-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-400">
            Audio & lyrics processed strictly in isolated temporary directories. Zero tracking, zero storage.
          </p>
          <p className="text-gray-400 font-mono text-[11px]">
            UIKEY AI • Song to SRT Generator by UIKEY
          </p>
        </div>
      </footer>
    </div>
  );
}
