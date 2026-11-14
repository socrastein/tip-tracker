/**
 * Dev-only: a made-up celebration pack (generated sounds and pictures, no
 * server, nothing downloaded) so pack celebrations can be previewed on the
 * dev server. Only CelebrationDevPanel.vue imports this, so none of it is
 * in the production build.
 */
import type { StoredMedium, StoredPackCelebration } from "../scripts/CelebrationPackStore";

const SAMPLE_RATE = 22050;
const NOTE_SECONDS = 0.25;
const MELODY_HERTZ = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1046.5];

/** A short rising melody as a 16-bit mono WAV file (header plus samples). */
function melodyWav(): Blob {
  const samplesPerNote = Math.floor(SAMPLE_RATE * NOTE_SECONDS);
  const sampleCount = samplesPerNote * MELODY_HERTZ.length;
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index++) view.setUint8(offset + index, text.charCodeAt(index));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + sampleCount * 2, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true); // size of the format block
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // bytes per second
  view.setUint16(32, 2, true); // bytes per frame
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, "data");
  view.setUint32(40, sampleCount * 2, true);
  for (let index = 0; index < sampleCount; index++) {
    const note = Math.floor(index / samplesPerNote);
    const fade = 1 - (index % samplesPerNote) / samplesPerNote; // each note dies away
    const sample = Math.sin((2 * Math.PI * MELODY_HERTZ[note] * index) / SAMPLE_RATE) * 0.3 * fade;
    view.setInt16(44 + index * 2, Math.round(sample * 32767), true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** A square PNG with a coloured background and a big emoji-free "$" drawn on it. */
function drawPng(background: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 200;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = background;
    context.fillRect(0, 0, 200, 200);
    context.fillStyle = "#ffffff";
    context.font = "bold 140px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("$", 100, 110);
  }
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? new Blob()), "image/png"));
}

/** A blob as a stored medium (the hash is not checked for the dev pack, so it is left empty). */
function medium(blob: Blob): StoredMedium {
  return { size: blob.size, sha256: "", blob };
}

/** A made-up celebration whose clip is the first 2 seconds of its sound. */
function sampleCelebration(id: string, name: string, media: { sound: Blob | null; picture: Blob | null }): StoredPackCelebration {
  return {
    id,
    name,
    startSeconds: 0,
    lengthSeconds: 2,
    sound: media.sound && medium(media.sound),
    picture: media.picture && medium(media.picture),
  };
}

/** The sample pack: one celebration with a sound and a picture, one with a sound alone and one with a picture alone. */
export async function buildSamplePackCelebrations(): Promise<StoredPackCelebration[]> {
  return [
    sampleCelebration("aaaaaaaaaaaa", "Pair", { sound: melodyWav(), picture: await drawPng("#6a1b9a") }),
    sampleCelebration("bbbbbbbbbbbb", "Sound alone", { sound: melodyWav(), picture: null }),
    sampleCelebration("cccccccccccc", "Picture alone", { sound: null, picture: await drawPng("#00838f") }),
  ];
}
