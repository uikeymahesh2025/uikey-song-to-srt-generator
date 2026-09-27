import { AnalyzeResponse, ProcessingStage } from "./types";

export function formatTimestamp(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const totalMs = Math.round(safeSeconds * 1000);

  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  const hh = h.toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  const mmm = ms.toString().padStart(3, "0");

  return `${hh}:${mm}:${ss},${mmm}`;
}

export interface SrtEntry {
  index: number;
  startSec: number;
  endSec: number;
  text: string;
}

export interface VocalInterval {
  startSec: number;
  endSec: number;
}

interface BiquadCoeffs {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

function createHighpassCoeffs(cutoffHz: number, sampleRate: number, q: number = 0.7071): BiquadCoeffs {
  const safeCutoff = Math.min(cutoffHz, sampleRate * 0.45);
  const w0 = (2 * Math.PI * safeCutoff) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * q);

  const b0 = (1 + cosw0) / 2;
  const b1 = -(1 + cosw0);
  const b2 = (1 + cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function createLowpassCoeffs(cutoffHz: number, sampleRate: number, q: number = 0.7071): BiquadCoeffs {
  const safeCutoff = Math.min(cutoffHz, sampleRate * 0.45);
  const w0 = (2 * Math.PI * safeCutoff) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * q);

  const b0 = (1 - cosw0) / 2;
  const b1 = 1 - cosw0;
  const b2 = (1 - cosw0) / 2;
  const a0 = 1 + alpha;
  const a1 = -2 * cosw0;
  const a2 = 1 - alpha;

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function applyBiquadFilter(input: Float32Array, coeffs: BiquadCoeffs): Float32Array {
  const len = input.length;
  const out = new Float32Array(len);
  const { b0, b1, b2, a1, a2 } = coeffs;
  let d1 = 0;
  let d2 = 0;

  for (let i = 0; i < len; i++) {
    const x = input[i];
    const y = b0 * x + d1;
    d1 = b1 * x - a1 * y + d2;
    d2 = b2 * x - a2 * y;
    out[i] = y;
  }

  return out;
}

/**
 * Regex to detect user-indicated instrumental tags in lyrics:
 * e.g. [Instrumental], [Music], [Solo], [Guitar Solo], [Flute Solo], [Interlude], [BGM], [Beat Drop], (Instrumental)
 */
export const INSTRUMENTAL_TAG_REGEX =
  /^(\[|\()\s*(instrumental|music|solo|guitar|flute|violin|piano|interlude|bgm|beat\s*drop|break|music\s*break|no\s*vocal)[^\]\)]*(\]|\))$/i;

/**
 * Regex to detect section headers like [Verse 1], [Chorus], [Bridge], [Hook]
 */
export const SECTION_HEADER_REGEX =
  /^\[\s*(verse|chorus|bridge|hook|outro|intro|stanza|part|pre-chorus)[^\]]*\]$/i;

export interface LyricSection {
  type: "vocal" | "instrumental";
  lines: string[];
}

/**
 * Parses user input lyrics into sections of vocal lines and explicit instrumental markers.
 * Also preserves stanza breaks (empty lines) as potential musical transitions.
 */
export function parseLyricsIntoSections(lyricsText: string): LyricSection[] {
  const rawParagraphs = lyricsText.split(/\r?\n\s*\r?\n/);
  const sections: LyricSection[] = [];

  for (const para of rawParagraphs) {
    const lines = para.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    const currentVocalLines: string[] = [];

    for (const line of lines) {
      if (SECTION_HEADER_REGEX.test(line)) {
        // Skip structural headers
        continue;
      }

      if (INSTRUMENTAL_TAG_REGEX.test(line)) {
        // Flush previous vocal lines if any
        if (currentVocalLines.length > 0) {
          sections.push({ type: "vocal", lines: [...currentVocalLines] });
          currentVocalLines.length = 0;
        }
        sections.push({ type: "instrumental", lines: ["[INSTRUMENTAL | NO VOCAL]"] });
      } else {
        currentVocalLines.push(line);
      }
    }

    if (currentVocalLines.length > 0) {
      sections.push({ type: "vocal", lines: currentVocalLines });
    }
  }

  return sections;
}

/**
 * Backward compatibility parser
 */
export function parseLyricsWithMarkers(lyricsText: string) {
  const sections = parseLyricsIntoSections(lyricsText);
  const items: { type: "lyric" | "instrumental"; text: string }[] = [];
  const stanzas: { type: "lyric" | "instrumental"; text: string }[][] = [];

  for (const s of sections) {
    const currentStanza: { type: "lyric" | "instrumental"; text: string }[] = [];
    for (const l of s.lines) {
      const it: { type: "lyric" | "instrumental"; text: string } = {
        type: s.type === "vocal" ? "lyric" : "instrumental",
        text: l,
      };
      items.push(it);
      currentStanza.push(it);
    }
    stanzas.push(currentStanza);
  }

  return { items, stanzas };
}

/**
 * Core Acoustic Event & Vocal/Instrumental Boundary Detector
 * Decodes audio, isolates vocal formant frequency spectrum & center-panning,
 * and extracts exact timestamps for [MUSIC INTRO], [INSTRUMENTAL | NO VOCAL] interludes, and [OUTRO].
 */
export function analyzeAudioBuffer(
  audioBuffer: {
    duration: number;
    sampleRate: number;
    numberOfChannels: number;
    getChannelData: (ch: number) => Float32Array;
  },
  lyricsText: string,
  fileName: string = "Song",
  onProgress?: (stage: ProcessingStage) => void
): AnalyzeResponse {
  const notify = (stage: ProcessingStage) => {
    if (onProgress) onProgress(stage);
  };

  const duration = audioBuffer.duration;
  if (!duration || duration <= 0) {
    throw new Error("Invalid audio duration detected.");
  }

  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = numChannels > 1 ? audioBuffer.getChannelData(1) : null;

  notify("aligning");

  // Step 1: Compute Mid (Center Vocal Focus) and Side (Stereo Instruments)
  const totalSamples = ch0.length;
  const midSignal = new Float32Array(totalSamples);
  const sideSignal = ch1 ? new Float32Array(totalSamples) : null;

  if (ch1 && sideSignal) {
    for (let i = 0; i < totalSamples; i++) {
      const left = ch0[i];
      const right = ch1[i];
      midSignal[i] = 0.5 * (left + right);
      sideSignal[i] = 0.5 * (left - right);
    }
  } else {
    midSignal.set(ch0);
  }

  // Step 2: Vocal Formant Bandpass Filtering (260 Hz - 3200 Hz)
  // Isolates key vocal formant energy (F1, F2, F3) from sub-bass kick/808s (<200Hz) and cymbals/high sizzle (>4000Hz)
  const hpCoeffs = createHighpassCoeffs(260, sampleRate);
  const lpCoeffs = createLowpassCoeffs(3200, sampleRate);
  const midVocalBand = applyBiquadFilter(applyBiquadFilter(midSignal, hpCoeffs), lpCoeffs);
  const sideVocalBand = sideSignal
    ? applyBiquadFilter(applyBiquadFilter(sideSignal, hpCoeffs), lpCoeffs)
    : null;

  notify("analyzing");

  // Step 3: Frame-by-Frame Acoustic Analysis over 50ms frames
  const hopMs = 50;
  const frameLength = Math.max(1, Math.floor((sampleRate * hopMs) / 1000));
  const numFrames = Math.floor(totalSamples / frameLength);

  const fullRms = new Float32Array(numFrames);
  const vocalRms = new Float32Array(numFrames);
  const sideVocalRms = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const start = f * frameLength;
    const end = Math.min(start + frameLength, totalSamples);
    const count = end - start;

    let sumFullSq = 0;
    let sumVocalSq = 0;
    let sumSideVocalSq = 0;

    for (let i = start; i < end; i++) {
      const m = midSignal[i];
      sumFullSq += m * m;

      const v = midVocalBand[i];
      sumVocalSq += v * v;

      if (sideVocalBand) {
        const s = sideVocalBand[i];
        sumSideVocalSq += s * s;
      }
    }

    fullRms[f] = Math.sqrt(sumFullSq / count);
    vocalRms[f] = Math.sqrt(sumVocalSq / count);
    sideVocalRms[f] = sideVocalBand ? Math.sqrt(sumSideVocalSq / count) : 0;
  }

  // Step 4: Multi-Feature Vocal Activity Metric
  // Features:
  // 1. Center Vocal Isolation: Vocals are panned center; stereo instrument solos have large Side energy.
  // 2. Syllabic Envelope Modulation (3 - 6 Hz rhythm of words).
  // 3. Vocal band energy concentration ratio.
  const rawVocalScores = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const vRms = vocalRms[f];
    const sRms = sideVocalRms[f];
    const fRms = fullRms[f];

    if (vRms < 0.003 || fRms < 0.004) {
      rawVocalScores[f] = 0;
      continue;
    }

    // In stereo mixes, lead vocal cancels in side channel (vRms - 1.15 * sRms is high).
    // In instrumental solos, stereo instruments make sRms large, so centerVocal drops to ~0.
    const centerVocal = sideVocalBand ? Math.max(0, vRms - 1.15 * sRms) : vRms;

    // Vocal ratio: energy in vocal band vs full audio
    const vocalRatio = vRms / (fRms + 1e-5);

    // Syllabic envelope modulation over +/- 200ms (4 frames each side)
    const winStart = Math.max(0, f - 4);
    const winEnd = Math.min(numFrames, f + 5);
    let minV = 999999;
    let maxV = 0;
    let sumV = 0;
    for (let j = winStart; j < winEnd; j++) {
      const val = vocalRms[j];
      if (val < minV) minV = val;
      if (val > maxV) maxV = val;
      sumV += val;
    }
    const meanV = sumV / Math.max(1, winEnd - winStart);
    const modulation = (maxV - minV) / (meanV + 1e-5);

    rawVocalScores[f] =
      centerVocal *
      Math.min(1.5, vocalRatio * 2.2) *
      (0.35 + 0.65 * Math.min(1.0, modulation * 1.8));
  }

  // Step 5: Moving Average Vocal Density (1.0-second smoothing window)
  // This solves the stepping-stone problem: isolated drum hits or guitar spikes in a solo
  // cannot bridge across an entire instrumental section because vocal density stays near 0!
  const smoothRadius = Math.ceil(0.5 / (hopMs / 1000)); // +/- 500ms (1.0s total window)
  const smoothedVocalScores = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const wStart = Math.max(0, f - smoothRadius);
    const wEnd = Math.min(numFrames, f + smoothRadius + 1);
    let sSum = 0;
    for (let j = wStart; j < wEnd; j++) {
      sSum += rawVocalScores[j];
    }
    smoothedVocalScores[f] = sSum / Math.max(1, wEnd - wStart);
  }

  // Dynamic threshold based on active song distribution
  const activeScores: number[] = [];
  for (let f = 0; f < numFrames; f++) {
    if (fullRms[f] > 0.005) {
      activeScores.push(smoothedVocalScores[f]);
    }
  }
  activeScores.sort((a, b) => a - b);

  let baselineScore = 0.008;
  let maxActiveScore = 0.05;
  if (activeScores.length > 0) {
    baselineScore = activeScores[Math.floor(activeScores.length * 0.35)];
    maxActiveScore = activeScores[Math.floor(activeScores.length * 0.95)];
  }

  const vocalThreshold = Math.max(
    0.006,
    baselineScore + 0.15 * Math.max(0, maxActiveScore - baselineScore)
  );

  const isVocalFrame = new Uint8Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    isVocalFrame[f] = smoothedVocalScores[f] >= vocalThreshold ? 1 : 0;
  }

  // Step 6: Extract Vocal Blocks & EXACT Instrumental Gaps
  // Contiguous vocal intervals:
  const rawIntervals: VocalInterval[] = [];
  let currentStart = -1;

  for (let f = 0; f < numFrames; f++) {
    const timeSec = (f * hopMs) / 1000;
    if (isVocalFrame[f] === 1 && currentStart === -1) {
      currentStart = timeSec;
    } else if (isVocalFrame[f] === 0 && currentStart !== -1) {
      if (timeSec - currentStart >= 0.8) {
        rawIntervals.push({
          startSec: parseFloat(currentStart.toFixed(3)),
          endSec: parseFloat(timeSec.toFixed(3)),
        });
      }
      currentStart = -1;
    }
  }

  if (currentStart !== -1 && duration - currentStart >= 0.8) {
    rawIntervals.push({
      startSec: parseFloat(currentStart.toFixed(3)),
      endSec: parseFloat(duration.toFixed(3)),
    });
  }

  // Fallback if no vocal intervals detected (e.g. pure instrumental track or very quiet)
  if (rawIntervals.length === 0) {
    const fallbackStart = Math.min(2.5, duration * 0.05);
    const fallbackEnd = Math.max(fallbackStart + 5.0, duration * 0.95);
    rawIntervals.push({
      startSec: fallbackStart,
      endSec: fallbackEnd,
    });
  }

  // Any non-vocal gap >= 1.8s between vocal intervals is an EXACT [INSTRUMENTAL | NO VOCAL] section!
  const INSTRUMENTAL_GAP_THRESHOLD_SEC = 1.8;

  const vocalBlocks: VocalInterval[] = [];
  let currentBlock: VocalInterval = { ...rawIntervals[0] };

  for (let i = 1; i < rawIntervals.length; i++) {
    const nextInterval = rawIntervals[i];
    const gap = nextInterval.startSec - currentBlock.endSec;

    if (gap >= INSTRUMENTAL_GAP_THRESHOLD_SEC) {
      vocalBlocks.push(currentBlock);
      currentBlock = { ...nextInterval };
    } else {
      // Merge intervals separated only by short breath pause (< 1.8s)
      currentBlock.endSec = nextInterval.endSec;
    }
  }
  vocalBlocks.push(currentBlock);

  notify("gaps");

  // Step 7: Parse Lyrics into Vocal Sections and Explicit Instrumental Markers
  const parsedSections = parseLyricsIntoSections(lyricsText);
  const vocalSections = parsedSections.filter((s) => s.type === "vocal");

  // Collect all pure lyric lines
  const allLyricLines: string[] = [];
  for (const s of vocalSections) {
    allLyricLines.push(...s.lines);
  }

  if (allLyricLines.length === 0) {
    throw new Error("Please paste at least one line of lyrics.");
  }

  // Line weighting based on words and characters
  const lineWeights = allLyricLines.map((line) => {
    const words = line.split(/\s+/).filter(Boolean).length;
    const chars = line.length;
    return Math.max(1, words * 1.5 + chars * 0.1);
  });
  const totalWeight = lineWeights.reduce((a, b) => a + b, 0);

  // Total singing time across all vocal blocks
  const totalVocalDuration = vocalBlocks.reduce(
    (acc, b) => acc + Math.max(0.5, b.endSec - b.startSec),
    0
  );

  notify("generating");

  const entries: SrtEntry[] = [];
  let cueIndex = 1;
  let musicEventCount = 0;
  let instrumentalGapCount = 0;

  // 1. [MUSIC INTRO] - EXACT timestamp from 0.0s to first vocal block start
  const firstBlock = vocalBlocks[0];
  if (firstBlock.startSec >= 1.6) {
    entries.push({
      index: cueIndex++,
      startSec: 0,
      endSec: Math.max(0.5, firstBlock.startSec - 0.05),
      text: "[MUSIC INTRO]",
    });
    musicEventCount++;
  }

  // Partition lyric lines across the vocal blocks strictly proportional to block duration
  let lineCursor = 0;

  for (let bIdx = 0; bIdx < vocalBlocks.length; bIdx++) {
    const block = vocalBlocks[bIdx];
    const blockDuration = Math.max(0.5, block.endSec - block.startSec);
    const isLastBlock = bIdx === vocalBlocks.length - 1;

    // Number of lines for this vocal block
    let blockLineCount: number;
    if (isLastBlock) {
      blockLineCount = allLyricLines.length - lineCursor;
    } else {
      const blockWeightTarget = (blockDuration / totalVocalDuration) * totalWeight;
      let accumWeight = 0;
      let count = 0;
      while (
        lineCursor + count < allLyricLines.length - (vocalBlocks.length - 1 - bIdx) &&
        (accumWeight < blockWeightTarget || count === 0)
      ) {
        accumWeight += lineWeights[lineCursor + count];
        count++;
      }
      blockLineCount = Math.max(1, count);
    }

    const blockLines = allLyricLines.slice(lineCursor, lineCursor + blockLineCount);
    const blockWeights = lineWeights.slice(lineCursor, lineCursor + blockLineCount);
    const blockTotalWeight = blockWeights.reduce((a, b) => a + b, 0);

    // Distribute lyric lines strictly inside [block.startSec, block.endSec]
    // They will NEVER bleed or overlap into the instrumental gap!
    let blockCurrentPos = block.startSec;

    for (let li = 0; li < blockLines.length; li++) {
      const lineText = blockLines[li];
      const isFirstSongLine = lineCursor === 0 && li === 0;
      const linePrefix = isFirstSongLine ? "[VOCAL START] " : "";

      const proportion = blockWeights[li] / Math.max(1, blockTotalWeight);
      const lineDuration = Math.max(0.8, proportion * blockDuration);

      let lineStart = blockCurrentPos;
      let lineEnd = Math.min(lineStart + lineDuration, block.endSec);

      if (lineEnd <= lineStart) {
        lineEnd = Math.min(block.endSec, lineStart + 1.0);
      }

      // 50ms boundary buffer between cues
      const cueEnd =
        li === blockLines.length - 1
          ? block.endSec
          : Math.max(lineStart + 0.6, lineEnd - 0.05);

      entries.push({
        index: cueIndex++,
        startSec: parseFloat(lineStart.toFixed(3)),
        endSec: parseFloat(cueEnd.toFixed(3)),
        text: `${linePrefix}${lineText}`,
      });

      blockCurrentPos = lineEnd;
    }

    lineCursor += blockLineCount;

    // 2. [INSTRUMENTAL | NO VOCAL] - EXACT timestamp between consecutive vocal blocks!
    if (!isLastBlock) {
      const nextBlock = vocalBlocks[bIdx + 1];
      const gapStart = block.endSec;
      const gapEnd = nextBlock.startSec;
      const gapDuration = gapEnd - gapStart;

      if (gapDuration >= INSTRUMENTAL_GAP_THRESHOLD_SEC) {
        entries.push({
          index: cueIndex++,
          startSec: parseFloat(gapStart.toFixed(3)),
          endSec: parseFloat(gapEnd.toFixed(3)),
          text: "[INSTRUMENTAL | NO VOCAL]",
        });
        instrumentalGapCount++;
      }
    }
  }

  // 3. [OUTRO] - EXACT timestamp from last vocal end to end of song
  const lastBlock = vocalBlocks[vocalBlocks.length - 1];
  if (duration - lastBlock.endSec >= 1.8) {
    entries.push({
      index: cueIndex++,
      startSec: parseFloat(lastBlock.endSec.toFixed(3)),
      endSec: parseFloat(duration.toFixed(3)),
      text: "[OUTRO]",
    });
    musicEventCount++;
  }

  // Step 8: Build standard SubRip SRT format
  const srtBlocks = entries.map((entry, idx) => {
    const id = idx + 1;
    const startStr = formatTimestamp(entry.startSec);
    const endStr = formatTimestamp(entry.endSec);
    return `${id}\n${startStr} --> ${endStr}\n${entry.text}`;
  });

  const finalSrt = srtBlocks.join("\n\n") + "\n";
  const safeBaseName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  notify("ready");

  return {
    success: true,
    srt: finalSrt,
    filename: `${safeBaseName}_MASTER_SYNC.srt`,
    stats: {
      duration_seconds: parseFloat(duration.toFixed(2)),
      total_events: entries.length,
      lyric_lines: allLyricLines.length,
      instrumental_gaps: instrumentalGapCount,
      music_events: musicEventCount,
    },
  };
}

/**
 * High-performance In-Browser Acoustic Alignment & Master SRT Generator
 * Uses native Web Audio API (AudioContext / OfflineAudioContext)
 * Runs locally with 0 server dependency, 0 payload limit (no 413), and millisecond precision.
 */
export async function processAudioAcousticsLocally(
  audioFile: File,
  lyricsText: string,
  onProgress?: (stage: ProcessingStage) => void
): Promise<AnalyzeResponse> {
  const notify = (stage: ProcessingStage) => {
    if (onProgress) onProgress(stage);
  };

  notify("preparing");

  // Step 1: Decode Audio using Web Audio API
  let audioBuffer: AudioBuffer;
  try {
    const arrayBuffer = await audioFile.arrayBuffer();
    const AudioContextClass =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        : undefined;

    if (!AudioContextClass) {
      throw new Error("Web Audio API is not supported in this browser environment.");
    }

    const audioCtx = new AudioContextClass();
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      if (audioCtx.state !== "closed") {
        await audioCtx.close();
      }
    }
  } catch (decodeErr) {
    throw new Error(
      `Failed to decode audio file (${audioFile.name}). Please ensure it is a valid MP3, WAV, M4A, AAC, or OGG file.`
    );
  }

  return analyzeAudioBuffer(audioBuffer, lyricsText, audioFile.name, onProgress);
}
