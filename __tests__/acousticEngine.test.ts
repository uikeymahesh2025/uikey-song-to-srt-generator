import { describe, it, expect } from "vitest";
import { formatTimestamp, analyzeAudioBuffer } from "@/lib/acousticEngine";

describe("Acoustic Engine Instrumental and Vocal Gap Detection Tests", () => {
  it("formats timestamps with exact millisecond precision and rollover", () => {
    expect(formatTimestamp(0)).toBe("00:00:00,000");
    expect(formatTimestamp(5.25)).toBe("00:00:05,250");
    expect(formatTimestamp(65.123)).toBe("00:01:05,123");
    expect(formatTimestamp(3661.05)).toBe("01:01:01,050");
    expect(formatTimestamp(59.9999)).toBe("00:01:00,000");
  });

  function createSyntheticAudio(
    sampleRate: number,
    durationSec: number,
    vocalSegments: { start: number; end: number }[]
  ) {
    const totalSamples = Math.floor(sampleRate * durationSec);
    const ch0 = new Float32Array(totalSamples);
    const ch1 = new Float32Array(totalSamples);

    // Add low-level instrumental background bed (drums/bass + cymbals)
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      // 80Hz bass + 5000Hz cymbal sizzle (non-vocal frequencies)
      const bass = 0.08 * Math.sin(2 * Math.PI * 80 * t);
      const cymbal = 0.04 * (Math.random() - 0.5);
      ch0[i] = bass + cymbal;
      ch1[i] = bass - cymbal; // stereo spread on instruments
    }

    // Add vocal formant frequencies (~800Hz - 1500Hz) centered (L=R) during vocal segments
    for (const seg of vocalSegments) {
      const startIdx = Math.floor(seg.start * sampleRate);
      const endIdx = Math.min(totalSamples, Math.floor(seg.end * sampleRate));
      for (let i = startIdx; i < endIdx; i++) {
        const t = i / sampleRate;
        const formant1 = 0.35 * Math.sin(2 * Math.PI * 750 * t);
        const formant2 = 0.25 * Math.sin(2 * Math.PI * 1450 * t);
        const vocal = formant1 + formant2;
        ch0[i] += vocal;
        ch1[i] += vocal; // centered vocal
      }
    }

    return {
      duration: durationSec,
      sampleRate,
      numberOfChannels: 2,
      getChannelData: (ch: number) => (ch === 0 ? ch0 : ch1),
    };
  }

  it("detects exact [MUSIC INTRO], [INSTRUMENTAL | NO VOCAL], and [OUTRO] timestamps", () => {
    // Song of 30 seconds:
    // 0.0s - 4.0s: Music Intro (instruments only)
    // 4.0s - 12.0s: Verse 1 (vocals singing)
    // 12.0s - 18.0s: Instrumental Solo / No Vocal (instruments only, 6.0 seconds gap)
    // 18.0s - 26.0s: Chorus (vocals singing)
    // 26.0s - 30.0s: Outro (instruments only, 4.0 seconds)
    const audio = createSyntheticAudio(22050, 30, [
      { start: 4.0, end: 12.0 },
      { start: 18.0, end: 26.0 },
    ]);

    const lyrics = `Line one of verse
Line two of verse
Chorus line one
Chorus line two`;

    const result = analyzeAudioBuffer(audio, lyrics, "My_Hit_Song.mp3");

    expect(result.success).toBe(true);
    expect(result.stats?.instrumental_gaps).toBeGreaterThanOrEqual(1);

    const srt = result.srt;

    // 1. Verify [MUSIC INTRO] exists at beginning
    expect(srt).toContain("[MUSIC INTRO]");
    expect(srt).toMatch(/00:00:00,000 --> 00:00:0[34],[0-9]{3}\n\[MUSIC INTRO\]/);

    // 2. Verify [INSTRUMENTAL | NO VOCAL] exists at exact interlude (~12.0s to ~18.0s)
    expect(srt).toContain("[INSTRUMENTAL | NO VOCAL]");
    // Check that instrumental starts around 11-13s and ends around 17-19s
    expect(srt).toMatch(/00:00:1[123],[0-9]{3} --> 00:00:1[789],[0-9]{3}\n\[INSTRUMENTAL \| NO VOCAL\]/);

    // 3. Verify [OUTRO] exists at song end (~26.0s to 30.0s)
    expect(srt).toContain("[OUTRO]");
    expect(srt).toMatch(/00:00:2[567],[0-9]{3} --> 00:00:30,000\n\[OUTRO\]/);

    // 4. Verify lyric lines have [VOCAL START] on the first line
    expect(srt).toContain("[VOCAL START] Line one of verse");
  });

  it("ensures lyric lines never overlap into [INSTRUMENTAL | NO VOCAL] gaps", () => {
    const audio = createSyntheticAudio(22050, 25, [
      { start: 2.0, end: 8.0 },
      { start: 14.0, end: 20.0 },
    ]);

    const lyrics = `Tere bina jeena nahi
Main to mar jaunga
Tu hi meri manzil hai
Tu hi mera jahan`;

    const result = analyzeAudioBuffer(audio, lyrics, "HindiSong.mp3");
    const blocks = result.srt.trim().split(/\n\s*\n/);

    let foundInstrumental = false;
    let instrumentalStart = 0;
    let instrumentalEnd = 0;

    for (const b of blocks) {
      const lines = b.split("\n");
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const text = lines.slice(2).join("\n");
        const [startStr, endStr] = timeLine.split("-->").map((s) => s.trim());

        const parseSec = (str: string) => {
          const parts = str.split(":");
          const secMs = parts[2].split(",");
          return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(secMs[0], 10) + parseInt(secMs[1], 10) / 1000;
        };

        const sSec = parseSec(startStr);
        const eSec = parseSec(endStr);

        if (text === "[INSTRUMENTAL | NO VOCAL]") {
          foundInstrumental = true;
          instrumentalStart = sSec;
          instrumentalEnd = eSec;
        } else if (!text.includes("[MUSIC INTRO]") && !text.includes("[OUTRO]")) {
          // If this is a lyric cue, verify it DOES NOT fall inside the instrumental interval
          if (foundInstrumental) {
            // Lines after the instrumental break must start at or after the gap ends
            expect(sSec).toBeGreaterThanOrEqual(instrumentalEnd - 0.05);
          } else {
            // Lines before the instrumental break must end before or at the gap start
            if (instrumentalStart > 0) {
              expect(eSec).toBeLessThanOrEqual(instrumentalStart + 0.05);
            }
          }
        }
      }
    }

    expect(foundInstrumental).toBe(true);
  });
});
