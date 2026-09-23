import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Home from "@/app/page";
import { ResultView } from "@/components/ResultView";
import { AudioUploader } from "@/components/AudioUploader";
import * as downloadModule from "@/lib/download";

// Mock fetch API
global.fetch = vi.fn();

describe("UIKEY AI Frontend Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Generate button stays disabled without audio", () => {
    render(<Home />);
    const textarea = screen.getByPlaceholderText(/Paste your original song lyrics/i);
    fireEvent.change(textarea, { target: { value: "Some song lyrics" } });

    const generateBtn = screen.getByRole("button", { name: /GENERATE MASTER SRT/i });
    expect(generateBtn).toBeDisabled();
  });

  it("2. Generate button stays disabled without lyrics", () => {
    render(<Home />);
    const generateBtn = screen.getByRole("button", { name: /GENERATE MASTER SRT/i });
    expect(generateBtn).toBeDisabled();
  });

  it("3. Rejects invalid audio file extension in AudioUploader", () => {
    const onFileSelect = vi.fn();
    render(<AudioUploader selectedFile={null} onFileSelect={onFileSelect} />);

    // Simulate selecting an invalid pdf file
    const invalidFile = new File(["dummy content"], "document.pdf", { type: "application/pdf" });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(hiddenInput, { target: { files: [invalidFile] } });

    // Verify onFileSelect was not called with the invalid file
    expect(onFileSelect).not.toHaveBeenCalled();
    // Verify error message displayed
    expect(screen.getByText(/Unsupported audio format/i)).toBeInTheDocument();
  });

  it("4. Shows loading state when processing starts", async () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves to simulate in-flight

    render(<Home />);
    const audioFile = new File(["audio dummy"], "track.mp3", { type: "audio/mp3" });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(hiddenInput, { target: { files: [audioFile] } });

    const textarea = screen.getByPlaceholderText(/Paste your original song lyrics/i);
    fireEvent.change(textarea, { target: { value: "Tere bina jeena nahi" } });

    const generateBtn = screen.getByRole("button", { name: /GENERATE MASTER SRT/i });
    expect(generateBtn).not.toBeDisabled();

    fireEvent.click(generateBtn);

    // Verify button switches to processing state
    expect(screen.getByText(/PROCESSING AUDIO & LYRICS/i)).toBeInTheDocument();
    expect(generateBtn).toBeDisabled();
  });

  it("5. Copy action writes to clipboard and shows copied feedback", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    const mockSrt = "1\n00:00:00,000 --> 00:00:05,000\n[MUSIC INTRO]\n";
    render(
      <ResultView
        srtContent={mockSrt}
        filename="Test_Song_MASTER_SYNC.srt"
      />
    );

    const copyBtn = screen.getByRole("button", { name: /COPY SRT/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(mockSrt);
    await waitFor(() => {
      expect(screen.getByText(/✓ COPIED/i)).toBeInTheDocument();
    });
  });

  it("6. Download action calls download utility with correct filename", () => {
    const downloadSpy = vi.spyOn(downloadModule, "downloadSrtFile").mockImplementation(() => {});

    const mockSrt = "1\n00:00:00,000 --> 00:00:05,000\n[MUSIC INTRO]\n";
    const filename = "Tum_Hi_Ho_MASTER_SYNC.srt";

    render(
      <ResultView
        srtContent={mockSrt}
        filename={filename}
      />
    );

    const downloadBtn = screen.getByRole("button", { name: /DOWNLOAD SRT/i });
    fireEvent.click(downloadBtn);

    expect(downloadSpy).toHaveBeenCalledWith(mockSrt, filename);
  });

  it("7. Share utility handles navigator.share gracefully on mobile", async () => {
    const originalShare = navigator.share;
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      share: shareMock,
      canShare: () => true,
    });

    const hindiSrt = "1\n00:00:00,000 --> 00:00:03,000\nतेरे बिना\n";
    const shared = await downloadModule.shareSrtFile(hindiSrt, "Tum_Hi_Ho_MASTER_SYNC.srt");

    expect(shared).toBe(true);
    expect(shareMock).toHaveBeenCalled();

    Object.assign(navigator, { share: originalShare });
  });

  it("8. Allows cancelling active processing", async () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // simulate hung request

    render(<Home />);
    const audioFile = new File(["audio dummy"], "track.mp3", { type: "audio/mp3" });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(hiddenInput, { target: { files: [audioFile] } });

    const textarea = screen.getByPlaceholderText(/Paste your original song lyrics/i);
    fireEvent.change(textarea, { target: { value: "Test lyrics" } });

    const generateBtn = screen.getByRole("button", { name: /GENERATE MASTER SRT/i });
    fireEvent.click(generateBtn);

    const cancelBtn = screen.getByRole("button", { name: /Cancel/i });
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.getByText(/Audio processing cancelled by user/i)).toBeInTheDocument();
    });
  });

  it("9. Rejects audio file exceeding 50 MB in AudioUploader", () => {
    const onFileSelect = vi.fn();
    render(<AudioUploader selectedFile={null} onFileSelect={onFileSelect} />);

    // Create a mock oversized file (> 50 MB)
    const oversizedFile = new File(["dummy content"], "large_track.mp3", { type: "audio/mp3" });
    Object.defineProperty(oversizedFile, "size", { value: 55 * 1024 * 1024 });

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(hiddenInput, { target: { files: [oversizedFile] } });

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/exceeds maximum allowed size of 50 MB/i)).toBeInTheDocument();
  });
});

