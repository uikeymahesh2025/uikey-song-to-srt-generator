/**
 * In-browser synthetic demo audio generator
 * Creates a valid 8-second musical tone WAV file for zero-friction 1-click testing.
 */
export function createDemoAudioFile(): File {
  const sampleRate = 16000;
  const durationSec = 8;
  const numSamples = sampleRate * durationSec;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // Write WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // PCM format
  view.setUint16(20, 1, true); // Audio format 1 (PCM)
  view.setUint16(22, 1, true); // Mono (1 channel)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  // Write synthetic melodic melody (harmonics at 440Hz, 330Hz, 554Hz)
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Envelope for smooth notes
    const envelope = Math.sin((Math.PI * (t % 2)) / 2);
    // Harmonious melody
    const freq = t < 2 ? 440 : t < 4 ? 493.88 : t < 6 ? 554.37 : 440;
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return new File([blob], "Tum_Hi_Ho_Demo_Song.wav", { type: "audio/wav" });
}

export const DEMO_LYRICS = `तेरे बिना जीना मुश्किल है
तुझसे ही मेरी हर सुबह है
दिल की यही दुआ है सदा
तू रहे संग हमेशा मेरे`;
