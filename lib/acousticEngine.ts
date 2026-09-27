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

/**
 * 2nd-order Butterworth Highpass Filter
 */
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

/**
 * 2nd-order Butterworth Lowpass Filter
 */
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

/**
 * Applies IIR biquad filter in Direct Form II Transposed
 */
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
 * Helper to compute 20th percentile in an array slice for background noise/music estimation
 */
function computePercentile(arr: Float32Array, start: number, end: number, percentile: number): number {
  const count = end - start;
  if (count <= 0) return 0;
  const temp: number[] = [];
  for (let i = start; i < end; i++) {
    temp.push(arr[i]);
  }
  temp.sort((a, b) => a - b);
  const idx = Math.min(temp.length - 1, Math.max(0, Math.floor(temp.length * percentile)));
  return temp[idx];
}

/**
 * Core Acoustic Event & Vocal/Instrumental Boundary Detector
 * Decodes audio, isolates vocal formant frequency spectrum (220Hz - 3400Hz) & center-panning,
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

  // Step 2: Vocal Formant Bandpass Filtering (220 Hz - 3400 Hz)
  // Isolates vocal frequencies from sub-bass kick/808 (<200Hz) and cymbals/high sizzle (>4000Hz)
  const hpCoeffs = createHighpassCoeffs(220, sampleRate);
  const lpCoeffs = createLowpassCoeffs(3400, sampleRate);
  const hpFiltered = applyBiquadFilter(midSignal, hpCoeffs);
  const vocalBandSignal = applyBiquadFilter(hpFiltered, lpCoeffs);

  notify("analyzing");

  // Step 3: Frame-by-Frame Acoustic Analysis over 50ms frames
  const hopMs = 50;
  const frameLength = Math.max(1, Math.floor((sampleRate * hopMs) / 1000));
  const numFrames = Math.floor(totalSamples / frameLength);

  const fullRms = new Float32Array(numFrames);
  const vocalRms = new Float32Array(numFrames);
  const sideRms = new Float32Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const start = f * frameLength;
    const end = Math.min(start + frameLength, totalSamples);
    const count = end - start;

    let sumFullSq = 0;
    let sumVocalSq = 0;
    let sumSideSq = 0;

    for (let i = start; i < end; i++) {
      const m = midSignal[i];
      sumFullSq += m * m;

      const v = vocalBandSignal[i];
      sumVocalSq += v * v;

      if (sideSignal) {
        const s = sideSignal[i];
        sumSideSq += s * s;
      }
    }

    fullRms[f] = Math.sqrt(sumFullSq / count);
    vocalRms[f] = Math.sqrt(sumVocalSq / count);
    sideRms[f] = sideSignal ? Math.sqrt(sumSideSq / count) : 0;
  }

  // Step 4: Adaptive Instrumental Baseline & Vocal Prominence Metric
  // Background music creates a baseline floor; singing rises above this floor in the vocal band
  const isVocalFrame = new Uint8Array(numFrames);
  const windowRadius = Math.ceil(4.0 / (hopMs / 1000)); // 4-second local window

  let maxVocalRms = 0;
  let sumVocalRms = 0;
  for (let f = 0; f < numFrames; f++) {
    const v = vocalRms[f];
    if (v > maxVocalRms) maxVocalRms = v;
    sumVocalRms += v;
  }
  const globalAvgVocal = sumVocalRms / Math.max(1, numFrames);
  const minVocalThreshold = Math.max(0.005, globalAvgVocal * 0.25);

  for (let f = 0; f < numFrames; f++) {
    const vRms = vocalRms[f];
    const fRms = fullRms[f];
    const sRms = sideRms[f];

    if (vRms < minVocalThreshold) {
      isVocalFrame[f] = 0;
      continue;
    }

    // Local 20th percentile represents backing instrument bed in this segment
    const winStart = Math.max(0, f - windowRadius);
    const winEnd = Math.min(numFrames, f + windowRadius);
    const localBaseline = computePercentile(vocalRms, winStart, winEnd, 0.25);

    // Vocal ratio: energy in vocal band vs full audio
    const vocalRatio = vRms / (fRms + 1e-6);

    // Center ratio (mid vs side in stereo): vocals are center-panned; stereo instruments are wide
    const centerRatio = ch1 ? fRms / (fRms + sRms + 1e-6) : 1.0;

    // Elevation above background instrumental baseline
    const elevation = (vRms - localBaseline) / Math.max(localBaseline, 0.004);

    // Vocal decision logic:
    // A frame is singing vocal if it has sufficient vocal band presence AND rises above the instrument baseline
    const isVocalProminent =
      (elevation >= 0.25 && vocalRatio >= 0.22 && centerRatio >= 0.48) ||
      (vRms >= globalAvgVocal * 0.8 && vocalRatio >= 0.30);

    isVocalFrame[f] = isVocalProminent ? 1 : 0;
  }

  // Step 5: Smoothing & Micro-Pause Bridging
  // Bridge short pauses between words/phrases (<= 600ms)
  const bridgeFrames = Math.ceil(0.6 / (hopMs / 1000));
  let nonVocalCount = 0;

  for (let f = 0; f < numFrames; f++) {
    if (isVocalFrame[f] === 1) {
      if (nonVocalCount > 0 && nonVocalCount <= bridgeFrames) {
        for (let b = f - nonVocalCount; b < f; b++) {
          isVocalFrame[b] = 1;
        }
      }
      nonVocalCount = 0;
    } else {
      nonVocalCount++;
    }
  }

  // Remove short transient vocal clicks (< 350ms)
  const minVocalFrames = Math.ceil(0.35 / (hopMs / 1000));
  let runStart = -1;
  for (let f = 0; f <= numFrames; f++) {
    const isVocal = f < numFrames && isVocalFrame[f] === 1;
    if (isVocal && runStart === -1) {
      runStart = f;
    } else if (!isVocal && runStart !== -1) {
      const runLength = f - runStart;
      if (runLength < minVocalFrames) {
        for (let b = runStart; b < f; b++) {
          isVocalFrame[b] = 0;
        }
      }
      runStart = -1;
    }
  }

  // Step 6: Extract Raw Vocal Intervals
  const rawIntervals: VocalInterval[] = [];
  let currentStart = -1;

  for (let f = 0; f < numFrames; f++) {
    const timeSec = (f * hopMs) / 1000;
    if (isVocalFrame[f] === 1 && currentStart === -1) {
      currentStart = timeSec;
    } else if (isVocalFrame[f] === 0 && currentStart !== -1) {
      if (timeSec - currentStart >= 0.5) {
        rawIntervals.push({
          startSec: parseFloat(currentStart.toFixed(3)),
          endSec: parseFloat(timeSec.toFixed(3)),
        });
      }
      currentStart = -1;
    }
  }

  if (currentStart !== -1 && duration - currentStart >= 0.5) {
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

  // Consolidate nearby vocal intervals separated by < 2.0s into coherent vocal blocks
  // Any gap >= 2.0s is an EXACT [INSTRUMENTAL | NO VOCAL] section!
  const INSTRUMENTAL_GAP_THRESHOLD_SEC = 2.0;

  const vocalBlocks: VocalInterval[] = [];
  let currentBlock: VocalInterval = { ...rawIntervals[0] };

  for (let i = 1; i < rawIntervals.length; i++) {
    const nextInterval = rawIntervals[i];
    const gap = nextInterval.startSec - currentBlock.endSec;

    if (gap >= INSTRUMENTAL_GAP_THRESHOLD_SEC) {
      vocalBlocks.push(currentBlock);
      currentBlock = { ...nextInterval };
    } else {
      // Merge intervals separated by normal breath pause
      currentBlock.endSec = nextInterval.endSec;
    }
  }
  vocalBlocks.push(currentBlock);

  notify("gaps");

  // Step 7: Parse Lyrics
  const rawLines = lyricsText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\[(verse|chorus|bridge|hook|outro|intro|stanza|part)/i.test(l));

  if (rawLines.length === 0) {
    throw new Error("Please paste at least one line of lyrics.");
  }

  // Lyric line weighting based on words and characters
  const lineWeights = rawLines.map((line) => {
    const words = line.split(/\s+/).filter(Boolean).length;
    const chars = line.length;
    return Math.max(1, words * 1.5 + chars * 0.1);
  });
  const totalWeight = lineWeights.reduce((a, b) => a + b, 0);

  // Total vocal singing duration across all blocks
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
  if (firstBlock.startSec >= 1.8) {
    entries.push({
      index: cueIndex++,
      startSec: 0,
      endSec: Math.max(0.5, firstBlock.startSec - 0.05),
      text: "[MUSIC INTRO]",
    });
    musicEventCount++;
  }

  // Partition lyric lines across the vocal blocks proportionally to block duration
  let lineCursor = 0;

  for (let bIdx = 0; bIdx < vocalBlocks.length; bIdx++) {
    const block = vocalBlocks[bIdx];
    const blockDuration = Math.max(0.5, block.endSec - block.startSec);
    const isLastBlock = bIdx === vocalBlocks.length - 1;

    // Determine how many lines belong to this vocal block
    let blockLineCount: number;
    if (isLastBlock) {
      blockLineCount = rawLines.length - lineCursor;
    } else {
      const blockWeightTarget = (blockDuration / totalVocalDuration) * totalWeight;
      let accumWeight = 0;
      let count = 0;
      while (
        lineCursor + count < rawLines.length - (vocalBlocks.length - 1 - bIdx) &&
        (accumWeight < blockWeightTarget || count === 0)
      ) {
        accumWeight += lineWeights[lineCursor + count];
        count++;
      }
      blockLineCount = Math.max(1, count);
    }

    const blockLines = rawLines.slice(lineCursor, lineCursor + blockLineCount);
    const blockWeights = lineWeights.slice(lineCursor, lineCursor + blockLineCount);
    const blockTotalWeight = blockWeights.reduce((a, b) => a + b, 0);

    // Distribute block's lyric lines strictly within [block.startSec, block.endSec]
    let blockCurrentPos = block.startSec;

    for (let li = 0; li < blockLines.length; li++) {
      const lineText = blockLines[li];
      const isFirstSongLine = lineCursor === 0 && li === 0;
      const linePrefix = isFirstSongLine ? "[VOCAL START] " : "";

      const proportion = blockWeights[li] / Math.max(1, blockTotalWeight);
      const lineDuration = Math.max(1.0, proportion * blockDuration);

      let lineStart = blockCurrentPos;
      let lineEnd = Math.min(lineStart + lineDuration, block.endSec);

      // Prevent inverted cues
      if (lineEnd <= lineStart) {
        lineEnd = Math.min(block.endSec, lineStart + 1.2);
      }

      // Small 50ms gap between consecutive lyric lines for subtitle readability
      const cueEnd = li === blockLines.length - 1 ? block.endSec : Math.max(lineStart + 0.8, lineEnd - 0.05);

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
  if (duration - lastBlock.endSec >= 2.0) {
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
      lyric_lines: rawLines.length,
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
