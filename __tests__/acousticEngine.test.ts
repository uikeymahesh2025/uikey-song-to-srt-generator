import { describe, it, expect } from "vitest";
import {
  formatTimestamp,
  analyzeAudioBuffer,
  parseLyricsWithMarkers,
} from "@/lib/acousticEngine";

describe("Acoustic Engine Instrumental and Vocal Gap Detection Tests", () => {
  it("formats timestamps with exact millisecond precision and rollover", () => {
    expect(formatTimestamp(0)).toBe("00:00:00,000");
    expect(formatTimestamp(5.25)).toBe("00:00:05,250");
    expect(formatTimestamp(65.123)).toBe("00:01:05,123");
    expect(formatTimestamp(3661.05)).toBe("01:01:01,050");
    expect(formatTimestamp(59.9999)).toBe("00:01:00,000");
  });

  it("parses user lyrics and separates explicit [Instrumental] tags from singing lyrics", () => {
    const rawLyrics = `[Verse 1]
Tere bina jeena nahi
Main to mar jaunga

[Instrumental]

[Chorus]
Tu hi meri manzil hai
Tu hi mera jahan`;

    const { items, stanzas } = parseLyricsWithMarkers(rawLyrics);
    const onlyLyrics = items.filter((it) => it.type === "lyric").map((it) => it.text);
    const instrumentals = items.filter((it) => it.type === "instrumental");

    expect(onlyLyrics).toHaveLength(4);
    expect(onlyLyrics).toEqual([
      "Tere bina jeena nahi",
      "Main to mar jaunga",
      "Tu hi meri manzil hai",
      "Tu hi mera jahan",
    ]);
    expect(instrumentals).toHaveLength(1);
    expect(instrumentals[0].text).toBe("[INSTRUMENTAL | NO VOCAL]");
  });

  function createRealisticSongAudio(
    sampleRate: number,
    durationSec: number,
    vocalSegments: { start: number; end: number }[],
    instrumentSoloSegments: { start: number; end: number }[]
  ) {
    const totalSamples = Math.floor(sampleRate * durationSec);
    const ch0 = new Float32Array(totalSamples);
    const ch1 = new Float32Array(totalSamples);

    // 1. Continuous backing track (bass, drums, synth pad)
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const bass = 0.08 * Math.sin(2 * Math.PI * 75 * t);
      const drumSnare = ((i % Math.floor(sampleRate * 0.5)) < 200 ? 0.15 : 0) * (Math.random() - 0.5);
      const stereoPad = 0.04 * Math.sin(2 * Math.PI * 440 * t);
      ch0[i] = bass + drumSnare + stereoPad;
      ch1[i] = bass + drumSnare - stereoPad; // wide stereo accompaniment
    }

    // 2. Add loud stereo instrument solos (guitar solo / flute / synth lead) during solo segments
    // Notice: Instrument solo is LOUD (amplitude 0.5) and has frequencies in vocal range (800Hz - 1500Hz),
    // but has wide stereo spread (L != R) and steady non-syllabic envelope.
    for (const solo of instrumentSoloSegments) {
      const startIdx = Math.floor(solo.start * sampleRate);
      const endIdx = Math.min(totalSamples, Math.floor(solo.end * sampleRate));
      for (let i = startIdx; i < endIdx; i++) {
        const t = i / sampleRate;
        const guitarLead = 0.45 * Math.sin(2 * Math.PI * 920 * t);
        // Stereo ping-pong/chorus effect on guitar solo
        ch0[i] += guitarLead;
        ch1[i] -= guitarLead * 0.85;
      }
    }

    // 3. Add human singing voice during vocal segments:
    // Centered (L = R), with syllabic modulation (alternating vowels/consonants at ~4Hz)
    for (const seg of vocalSegments) {
      const startIdx = Math.floor(seg.start * sampleRate);
      const endIdx = Math.min(totalSamples, Math.floor(seg.end * sampleRate));
      for (let i = startIdx; i < endIdx; i++) {
        const t = i / sampleRate;
        // 4Hz syllabic rhythm: envelope peaks on vowels, dips between syllables
        const syllableEnv = 0.6 + 0.4 * Math.sin(2 * Math.PI * 4 * t);
        const formant1 = 0.35 * Math.sin(2 * Math.PI * 720 * t);
        const formant2 = 0.25 * Math.sin(2 * Math.PI * 1450 * t);
        const vocal = syllableEnv * (formant1 + formant2);
        // Center panned lead vocal (L == R)
        ch0[i] += vocal;
        ch1[i] += vocal;
      }
    }

    return {
      duration: durationSec,
      sampleRate,
      numberOfChannels: 2,
      getChannelData: (ch: number) => (ch === 0 ? ch0 : ch1),
    };
  }

  it("accurately detects [INSTRUMENTAL | NO VOCAL] even when a loud guitar/synth solo plays in the interlude", () => {
    // 30 second song:
    // 0.0s - 4.0s: Music Intro
    // 4.0s - 12.0s: Verse 1 (vocals singing)
    // 12.0s - 19.0s: Loud Guitar Solo / Instrumental Interlude (NO singing vocals)
    // 19.0s - 26.0s: Chorus (vocals singing)
    // 26.0s - 30.0s: Outro
    const audio = createRealisticSongAudio(
      22050,
      30,
      [
        { start: 4.0, end: 12.0 },
        { start: 19.0, end: 26.0 },
      ],
      [{ start: 12.0, end: 19.0 }] // Loud guitar solo during the interlude!
    );

    const lyrics = `[Verse 1]
Pal ek pal me tham sa gaya
Tu hath me hath jo de gaya

[Instrumental]

[Chorus]
Main jahan rahoon
Main kahin bhi hoon`;

    const result = analyzeAudioBuffer(audio, lyrics, "RockSong.mp3");

    expect(result.success).toBe(true);
    expect(result.stats?.instrumental_gaps).toBeGreaterThanOrEqual(1);

    const srt = result.srt;

    // 1. Verify [MUSIC INTRO] exists at beginning
    expect(srt).toContain("[MUSIC INTRO]");

    // 2. Verify [INSTRUMENTAL | NO VOCAL] is generated during the loud guitar solo (~12s to ~19s)
    expect(srt).toContain("[INSTRUMENTAL | NO VOCAL]");
    expect(srt).toMatch(/00:00:1[123],[0-9]{3} --> 00:00:1[890],[0-9]{3}\n\[INSTRUMENTAL \| NO VOCAL\]/);

    // 3. Verify [OUTRO] exists at end (~26s to 30s)
    expect(srt).toContain("[OUTRO]");

    // 4. Verify lyric lines are placed in singing sections, NEVER in the guitar solo
    expect(srt).toContain("Pal ek pal me tham sa gaya");
    expect(srt).toContain("Tu hath me hath jo de gaya");
    expect(srt).toContain("Main jahan rahoon");
    expect(srt).toContain("Main kahin bhi hoon");

    // Ensure the words '[Instrumental]' are NOT sung as lyrics!
    expect(srt).not.toMatch(/\[VOCAL START\] \[Instrumental\]/);
  });

  it("ensures lyric lines never overlap into [INSTRUMENTAL | NO VOCAL] gaps", () => {
    const audio = createRealisticSongAudio(
      22050,
      25,
      [
        { start: 2.0, end: 9.0 },
        { start: 15.0, end: 21.0 },
      ],
      [{ start: 9.0, end: 15.0 }]
    );

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
            expect(sSec).toBeGreaterThanOrEqual(instrumentalEnd - 0.05);
          } else {
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
