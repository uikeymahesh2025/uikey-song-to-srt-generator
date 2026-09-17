/**
 * Client-side browser download utility for generated SRT files
 * Uses Blob and URL.createObjectURL with UTF-8 encoding and standard MIME type
 */
export function downloadSrtFile(srtContent: string, filename: string): void {
  // Ensure UTF-8 byte order mark or encoding
  const blob = new Blob([srtContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "SONG_MASTER_SYNC.srt";
  document.body.appendChild(anchor);
  anchor.click();

  // Cleanup object URL
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 150);
}
