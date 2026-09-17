import { AnalyzeResponse } from "./types";

export async function analyzeSong(
  audioFile: File,
  lyricsText: string
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("audio", audioFile);
  formData.append("lyrics", lyricsText);

  // We attempt relative Next.js API route first (/api/analyze) to bypass all CORS / IPv6 hurdles
  // Fallback to direct backend URL if provided
  const endpoints = [
    "/api/analyze",
    "http://127.0.0.1:8000/analyze",
    "http://localhost:8000/analyze",
  ];

  if (process.env.NEXT_PUBLIC_API_URL) {
    const customUrl = `${process.env.NEXT_PUBLIC_API_URL.replace(/\/+$/, "")}/analyze`;
    if (!endpoints.includes(customUrl)) {
      endpoints.unshift(customUrl);
    }
  }

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = `Server error (${response.status})`;
        try {
          const errorJson = await response.json();
          if (errorJson.detail) {
            errorMessage =
              typeof errorJson.detail === "string"
                ? errorJson.detail
                : JSON.stringify(errorJson.detail);
          }
        } catch {
          // Response wasn't JSON
        }
        throw new Error(errorMessage);
      }

      const data: AnalyzeResponse = await response.json();
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        // If it's a specific validation/audio error from server, don't fallback, throw immediately
        if (!err.message.includes("Failed to fetch") && !err.message.includes("NetworkError") && !err.message.includes("Load failed")) {
          throw err;
        }
        lastError = err;
      } else {
        lastError = new Error("An unknown network error occurred.");
      }
    }
  }

  throw new Error(
    lastError?.message ||
      "Cannot reach the audio analysis worker. Please ensure the backend is started on port 8000."
  );
}
