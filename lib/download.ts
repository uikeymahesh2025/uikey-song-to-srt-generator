/**
 * Client-side browser download & share utility for generated SRT files
 * Fully optimized for Android Chrome, iOS Safari, and Desktop browsers.
 */

export function downloadSrtFile(
  srtContent: string,
  filename: string,
  mimeType: string = "text/plain;charset=utf-8"
): void {
  // Prepend UTF-8 Byte Order Mark (BOM) to enforce correct Hindi Devanagari rendering in media players
  const contentWithBom = srtContent.startsWith("\uFEFF")
    ? srtContent
    : "\uFEFF" + srtContent;

  const blob = new Blob([contentWithBom], { type: mimeType });
  const urlHelper =
    typeof window !== "undefined" && window.URL ? window.URL : URL;

  let url: string;
  try {
    url = urlHelper.createObjectURL(blob);
  } catch {
    // Fallback for sandboxed webviews without createObjectURL support
    url = `data:${mimeType},${encodeURIComponent(contentWithBom)}`;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "SONG_MASTER_SYNC.srt";
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";

  // Required for Firefox & some Android browsers
  document.body.appendChild(anchor);
  anchor.click();

  // On Android and mobile WebViews, revoking after 150ms causes download failures
  // Keep Object URL active for 60 seconds to allow async download managers to fetch it
  if (url.startsWith("blob:")) {
    setTimeout(() => {
      try {
        if (document.body.contains(anchor)) {
          document.body.removeChild(anchor);
        }
        urlHelper.revokeObjectURL(url);
      } catch {
        // Ignored
      }
    }, 60000);
  } else {
    setTimeout(() => {
      try {
        if (document.body.contains(anchor)) {
          document.body.removeChild(anchor);
        }
      } catch {
        // Ignored
      }
    }, 1000);
  }
}

/**
 * Native Mobile Share support (Android & iOS)
 * Allows users to directly save to files or share to WhatsApp / Google Drive
 */
export async function shareSrtFile(
  srtContent: string,
  filename: string
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) {
    return false;
  }

  const contentWithBom = srtContent.startsWith("\uFEFF")
    ? srtContent
    : "\uFEFF" + srtContent;

  const safeFilename = filename.endsWith(".srt") ? filename : `${filename}.srt`;

  try {
    const file = new File([contentWithBom], safeFilename, {
      type: "text/plain;charset=utf-8",
    });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: safeFilename,
        text: `Master Sync SRT for ${safeFilename}`,
        files: [file],
      });
      return true;
    }
  } catch (err: unknown) {
    // User cancelled or share failed, fallback to normal download
    if (err instanceof Error && err.name === "AbortError") {
      return true; // user closed share dialog, no error needed
    }
  }

  return false;
}
