"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  UploadCloud,
  FileAudio,
  Trash2,
  Play,
  Pause,
  Sparkles,
} from "lucide-react";

interface AudioUploaderProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
  onLoadDemo?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

const SUPPORTED_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];
const ACCEPT_STRING = SUPPORTED_EXTENSIONS.join(",");

export const AudioUploader: React.FC<AudioUploaderProps> = ({
  selectedFile,
  onFileSelect,
  disabled = false,
  onLoadDemo,
  onTimeUpdate,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Manage Object URL for audio playback
  useEffect(() => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setAudioUrl(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [selectedFile]);

  const validateAndSetFile = (file: File) => {
    setFormatError(null);
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      setFormatError(
        `Unsupported audio format (${ext}). Supported formats: MP3, WAV, M4A, AAC, OGG.`
      );
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setFormatError("Audio file exceeds maximum allowed size of 50 MB.");
      return;
    }
    onFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioRef.current) return;
    const cur = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);
    if (onTimeUpdate) {
      onTimeUpdate(cur, dur);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6 transition-all border border-white/[0.08] shadow-2xl relative overflow-hidden">
      {/* Subtle top corner gradient glow */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center border border-emerald-500/40 shadow-sm flex-shrink-0">
            1
          </span>
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <span>STEP 1: UPLOAD SONG AUDIO</span>
              <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-400 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                REQUIRED
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onLoadDemo && !selectedFile && (
            <button
              type="button"
              onClick={onLoadDemo}
              disabled={disabled}
              className="text-xs font-bold px-2.5 py-1.5 min-h-[36px] rounded-md bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 active:bg-emerald-500/35 border border-emerald-500/30 transition flex items-center gap-1 shadow-sm touch-manipulation"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Load Demo Song</span>
            </button>
          )}
          <span className="hidden sm:inline text-xs text-gray-400 font-mono">
            MP3 • WAV • M4A • AAC • OGG
          </span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            validateAndSetFile(e.target.files[0]);
          }
        }}
        disabled={disabled}
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 sm:p-9 text-center cursor-pointer transition-all duration-200 relative group touch-manipulation ${
            isDragOver
              ? "border-emerald-400 bg-emerald-950/30 scale-[0.99]"
              : "border-white/[0.1] hover:border-emerald-500/40 bg-white/[0.02] hover:bg-emerald-500/[0.03]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-b from-gray-800/80 to-gray-900 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:border-emerald-500/50 transition-all duration-200 shadow-lg">
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-100 group-hover:text-emerald-300 transition">
                Tap to browse or drop song audio here
              </p>
              <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
                Supports MP3, WAV, M4A, AAC, OGG (Up to 50 MB)
              </p>
            </div>

            <button
              type="button"
              disabled={disabled}
              className="mt-1 px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 active:bg-emerald-500/40 text-emerald-300 border border-emerald-500/40 transition shadow-sm touch-manipulation"
            >
              CHOOSE AUDIO FILE
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Audio Player Card */}
          <div className="rounded-xl bg-gradient-to-r from-gray-900/90 via-gray-900/80 to-emerald-950/30 border border-emerald-500/30 p-3.5 sm:p-4 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0 flex-1">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-inner">
                  <FileAudio className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="overflow-hidden min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-bold text-white truncate">
                    {selectedFile.name}
                  </p>
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-400 mt-0.5">
                    <span className="font-mono text-emerald-400 font-semibold">
                      {formatFileSize(selectedFile.size)}
                    </span>
                    <span>•</span>
                    <span className="uppercase font-mono">
                      {selectedFile.name.split(".").pop()}
                    </span>
                    {duration > 0 && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-gray-300">
                          {formatTime(duration)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center flex-shrink-0">
                <button
                  type="button"
                  onClick={() => !disabled && onFileSelect(null)}
                  disabled={disabled}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition border border-transparent hover:border-red-900/40 touch-manipulation"
                  title="Remove audio file"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* Audio Waveform Player */}
            {audioUrl && (
              <div className="bg-black/40 rounded-lg p-2.5 sm:p-3 border border-white/[0.06] space-y-2">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onTimeUpdate={handleAudioTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  onLoadedMetadata={handleAudioTimeUpdate}
                  className="hidden"
                />

                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-gray-950 flex items-center justify-center transition shadow-md flex-shrink-0 touch-manipulation"
                      title={isPlaying ? "Pause audio" : "Play audio"}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Waveform Visualization Bars */}
                    <div className="flex items-center gap-1 h-7 px-1 flex-shrink-0">
                      <div
                        className={`w-1 rounded-full bg-emerald-400 ${
                          isPlaying ? "wave-bar-1" : "h-3"
                        }`}
                      ></div>
                      <div
                        className={`w-1 rounded-full bg-emerald-400 ${
                          isPlaying ? "wave-bar-2" : "h-5"
                        }`}
                      ></div>
                      <div
                        className={`w-1 rounded-full bg-emerald-400 ${
                          isPlaying ? "wave-bar-3" : "h-2"
                        }`}
                      ></div>
                      <div
                        className={`w-1 rounded-full bg-emerald-400 ${
                          isPlaying ? "wave-bar-4" : "h-6"
                        }`}
                      ></div>
                      <div
                        className={`w-1 rounded-full bg-emerald-400 ${
                          isPlaying ? "wave-bar-2" : "h-4"
                        }`}
                      ></div>
                      <div
                        className={`w-1 rounded-full bg-emerald-400 ${
                          isPlaying ? "wave-bar-3" : "h-2"
                        }`}
                      ></div>
                    </div>

                    <div className="text-xs font-mono text-gray-300 ml-auto sm:hidden">
                      <span className="text-emerald-300 font-bold">
                        {formatTime(currentTime)}
                      </span>{" "}
                      / {formatTime(duration)}
                    </div>
                  </div>

                  {/* Scrubber Bar */}
                  <div className="flex-1 flex items-center gap-2 w-full">
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 py-1"
                    />
                  </div>

                  <div className="hidden sm:block text-xs font-mono text-gray-400 flex-shrink-0">
                    <span className="text-emerald-300 font-bold">
                      {formatTime(currentTime)}
                    </span>{" "}
                    / {formatTime(duration)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {formatError && (
        <div className="mt-3 p-3 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-start gap-2">
          <span className="font-bold flex-shrink-0">Error:</span>
          <span>{formatError}</span>
        </div>
      )}
    </div>
  );
};
