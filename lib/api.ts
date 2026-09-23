import { AnalyzeResponse, ProcessingStage } from "./types";
import { processAudioAcousticsLocally } from "./acousticEngine";

const MAX_SUPPORTED_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB documented limit
const VERCEL_SERVERLESS_LIMIT = 4.0 * 1024 * 1024; // 4.0 MB safe threshold for Vercel 4.5MB limit
const SUPPORTED_EXTENSIONS = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];

export async function analyzeSong(
  audioFile: File,
  lyricsText: string,
  onProgress?: (stage: ProcessingStage) => void
): Promise<AnalyzeResponse> {
  const originalSizeMB = (audioFile.size / (1024 * 1024)).toFixed(2);
  const ext = "." + audioFile.name.split(".").pop()?.toLowerCase();

  // 1. Client-Side Format & Size Validation
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported audio format (${ext}). Supported formats: MP3, WAV, M4A, AAC, OGG.`
    );
  }

  if (audioFile.size > MAX_SUPPORTED_SIZE_BYTES) {
    throw new Error(
      `Audio file (${originalSizeMB} MB) exceeds maximum allowed size of 50 MB.`
    );
  }

  if (!lyricsText.trim()) {
    throw new Error("Song lyrics are required to generate master sync SRT.");
  }

  // Safe Diagnostics (Never logs audio content, secrets, or API keys)
  if (typeof window !== "undefined") {
    console.info(
      `[Safe Diagnostics] Original file: ${audioFile.name} | Size: ${audioFile.size} bytes (${originalSizeMB} MB) | Type: ${audioFile.type || ext}`
    );
  }

  const customWorkerUrl = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")}/analyze`
    : null;

  // 2. Direct-to-Engine Routing:
  // Vercel serverless functions strictly reject payloads > 4.5MB with HTTP 413.
  // When payload exceeds 4.0MB, or when no external worker is active,
  // execute the high-precision Web Audio Acoustic Engine directly in the browser.
  const isTooLargeForServerless = audioFile.size > VERCEL_SERVERLESS_LIMIT;

  if (isTooLargeForServerless && !customWorkerUrl) {
    if (typeof window !== "undefined") {
      console.info(
        `[Safe Diagnostics] File size (${originalSizeMB} MB) exceeds serverless payload limits. Routing directly to In-Browser Acoustic Engine.`
      );
    }
    return await processAudioAcousticsLocally(audioFile, lyricsText, onProgress);
  }

  // Determine single remote target (No duplicate uploads across multiple endpoints)
  const targetEndpoint = customWorkerUrl || (isTooLargeForServerless ? null : "/api/analyze");

  if (targetEndpoint) {
    try {
      if (onProgress) onProgress("uploading" as ProcessingStage);

      // Binary multipart/form-data single upload
      // Note: We DO NOT manually set Content-Type header; browser sets boundary automatically
      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("lyrics", lyricsText);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s network timeout

      const response = await fetch(targetEndpoint, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: AnalyzeResponse = await response.json();
        if (onProgress) onProgress("ready");
        return data;
      }

      // Handle structured errors (413, 415, 503, etc.)
      let errorDetail = `Server error (${response.status})`;
      try {
        const errorJson = await response.json();
        if (errorJson.detail) {
          errorDetail =
            typeof errorJson.detail === "string"
              ? errorJson.detail
              : JSON.stringify(errorJson.detail);
        }
      } catch {
        if (response.status === 413) {
          errorDetail =
            "Audio file payload exceeded server capacity (413). Switching to direct client acoustic engine.";
        }
      }

      if (typeof window !== "undefined") {
        console.warn(
          `[Safe Diagnostics] Remote endpoint ${targetEndpoint} returned ${response.status}: ${errorDetail}. Falling back to in-browser engine.`
        );
      }
    } catch (remoteErr: unknown) {
      if (typeof window !== "undefined") {
        const msg = remoteErr instanceof Error ? remoteErr.message : String(remoteErr);
        console.warn(
          `[Safe Diagnostics] Remote endpoint request failed (${msg}). Falling back to in-browser engine.`
        );
      }
    }
  }

  // 3. Graceful In-Browser Acoustic Engine Fallback
  // Decodes audio locally via Web Audio API, detects vocal intervals, and generates master SRT.
  return await processAudioAcousticsLocally(audioFile, lyricsText, onProgress);
}

