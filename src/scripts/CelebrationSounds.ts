import type { CelebrationName } from "./CelebrationRotation";
import {
  BUILT_IN_CELEBRATION_SECONDS,
  CONFETTI_BURSTS,
  FIREWORK_FLIGHT_SECONDS,
  FIREWORK_ROCKETS,
  JACKPOT_REEL_STOP_SECONDS,
} from "./CelebrationTimings";

/**
 * Sounds for the celebrations, all synthesized with the Web Audio API
 * (oscillators and filtered noise): nothing is downloaded or sampled, so
 * there is no third-party audio in the app.
 *
 * Browsers only let a page make sound after a tap. unlockAudioContext()
 * must therefore run synchronously inside the Confirm tap's handler; after
 * that the context may be used at any later time (a custom clip that has to
 * be decoded first, for example).
 */

type BuiltInCelebration = Exclude<CelebrationName, "custom">;
type SoundScore = (context: AudioContext, startTime: number, output: AudioNode) => void;

const MASTER_VOLUME = 0.5; // headroom so layered tones never clip

// Note frequencies in hertz (equal temperament, A4 = 440 Hz).
const NOTE_C5 = 523.25;
const NOTE_E5 = 659.25;
const NOTE_G5 = 783.99;
const NOTE_C6 = 1046.5;
const NOTE_E6 = 1318.5;
const NOTE_G6 = 1568;
const BELL_HIGH = 1760; // A6, the "ching" of the cash register bell
const BELL_LOW = 1318.5; // E6, the "cha"

let sharedContext: AudioContext | null = null;

/** The page's AudioContext, created on first use (standard or the older webkit-prefixed name). */
export function getAudioContext(): AudioContext {
  if (sharedContext === null) {
    const Constructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    sharedContext = new Constructor();
  }
  return sharedContext;
}

/**
 * Allow sound: resume the context and play one silent sample, which is what
 * iOS Safari needs to treat the context as started by a tap. Call this
 * synchronously from a tap handler.
 */
export function unlockAudioContext(): AudioContext {
  const context = getAudioContext();
  if (context.state === "suspended") void context.resume();
  const silentSource = context.createBufferSource();
  silentSource.buffer = context.createBuffer(1, 1, context.sampleRate);
  silentSource.connect(context.destination);
  silentSource.start(0);
  return context;
}

/** One oscillator note with a quick attack and an exponential fade-out. */
function playTone(
  context: AudioContext,
  output: AudioNode,
  options: { frequency: number; startTime: number; duration: number; volume: number; type?: OscillatorType },
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = options.type ?? "sine";
  oscillator.frequency.value = options.frequency;
  envelope.gain.setValueAtTime(0.0001, options.startTime);
  envelope.gain.exponentialRampToValueAtTime(options.volume, options.startTime + 0.01);
  envelope.gain.exponentialRampToValueAtTime(0.0001, options.startTime + options.duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(options.startTime);
  oscillator.stop(options.startTime + options.duration + 0.05);
}

/** A burst of band-filtered noise: clicks, whooshes, booms and crackle. */
function playNoise(
  context: AudioContext,
  output: AudioNode,
  options: { startTime: number; duration: number; volume: number; filterFrequency: number; filterType?: BiquadFilterType },
): void {
  const sampleCount = Math.ceil(context.sampleRate * options.duration);
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index++) samples[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = buffer;
  filter.type = options.filterType ?? "bandpass";
  filter.frequency.value = options.filterFrequency;
  envelope.gain.setValueAtTime(options.volume, options.startTime);
  envelope.gain.exponentialRampToValueAtTime(0.0001, options.startTime + options.duration);
  source.connect(filter).connect(envelope).connect(output);
  source.start(options.startTime);
}

/** A sine that glides from one pitch to another: whistles and boom thumps. */
function playGlide(
  context: AudioContext,
  output: AudioNode,
  options: { fromFrequency: number; toFrequency: number; startTime: number; duration: number; volume: number },
): void {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.frequency.setValueAtTime(options.fromFrequency, options.startTime);
  oscillator.frequency.exponentialRampToValueAtTime(options.toFrequency, options.startTime + options.duration);
  envelope.gain.setValueAtTime(options.volume, options.startTime);
  envelope.gain.exponentialRampToValueAtTime(0.0001, options.startTime + options.duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(options.startTime);
  oscillator.stop(options.startTime + options.duration + 0.05);
}

/** The cash register: a drawer click, then "cha" and a longer "ching" bell. */
const cashRegister: SoundScore = (context, startTime, output) => {
  playNoise(context, output, { startTime, duration: 0.05, volume: 0.6, filterFrequency: 2500 });
  playTone(context, output, { frequency: BELL_LOW, startTime: startTime + 0.08, duration: 0.5, volume: 0.35, type: "triangle" });
  playTone(context, output, { frequency: BELL_HIGH, startTime: startTime + 0.2, duration: 1.2, volume: 0.35, type: "triangle" });
};

/** A scatter of coin tinkles falling away. */
const coinTinkles: SoundScore = (context, startTime, output) => {
  const tinkleCount = 9;
  for (let index = 0; index < tinkleCount; index++) {
    const time = startTime + index * 0.11 + Math.random() * 0.05;
    const pitch = 2400 + Math.random() * 1800;
    playTone(context, output, { frequency: pitch, startTime: time, duration: 0.18, volume: 0.12 * (1 - index / tinkleCount) });
  }
};

/** Bills rain: a soft whoosh under the cash register, then coins tinkling through the rest of the six seconds. */
const billsRainScore: SoundScore = (context, startTime, output) => {
  playNoise(context, output, { startTime, duration: 2.4, volume: 0.25, filterFrequency: 900 });
  cashRegister(context, startTime + 0.1, output);
  coinTinkles(context, startTime + 0.9, output);
  coinTinkles(context, startTime + 2.6, output);
  cashRegister(context, startTime + 3.6, output);
  coinTinkles(context, startTime + 4.4, output);
};

/** One party-popper bang. */
function playPop(context: AudioContext, output: AudioNode, startTime: number): void {
  playNoise(context, output, { startTime, duration: 0.18, volume: 0.9, filterFrequency: 1200 });
  playGlide(context, output, { fromFrequency: 220, toFrequency: 60, startTime, duration: 0.2, volume: 0.6 });
}

/** Confetti: a pop for each burst as it works up the screen, with the cash register on the first and last. */
const confettiScore: SoundScore = (context, startTime, output) => {
  CONFETTI_BURSTS.forEach((burst, index) => {
    playPop(context, output, startTime + burst.atSeconds);
    // Each pop a little higher, like the bursts.
    playTone(context, output, { frequency: NOTE_C5 * 2 ** (index / 4), startTime: startTime + burst.atSeconds + 0.05, duration: 0.5, volume: 0.15, type: "triangle" });
  });
  cashRegister(context, startTime + CONFETTI_BURSTS[0].atSeconds + 0.3, output);
  cashRegister(context, startTime + CONFETTI_BURSTS[CONFETTI_BURSTS.length - 1].atSeconds + 0.3, output);
};

/** One firework: a whistle rising for the whole flight, then a boom and crackling sparks where it bursts. */
function playFirework(context: AudioContext, output: AudioNode, startTime: number): void {
  playGlide(context, output, { fromFrequency: 500, toFrequency: 1800, startTime, duration: FIREWORK_FLIGHT_SECONDS, volume: 0.12 });
  const boomTime = startTime + FIREWORK_FLIGHT_SECONDS;
  playNoise(context, output, { startTime: boomTime, duration: 0.7, volume: 0.9, filterFrequency: 300, filterType: "lowpass" });
  playGlide(context, output, { fromFrequency: 160, toFrequency: 35, startTime: boomTime, duration: 0.5, volume: 0.8 });
  const crackleCount = 12;
  for (let index = 0; index < crackleCount; index++) {
    const time = boomTime + 0.15 + Math.random() * 0.8;
    playNoise(context, output, { startTime: time, duration: 0.03, volume: 0.3, filterFrequency: 5000, filterType: "highpass" });
  }
}

/** Fireworks: a whistle and boom for every rocket the animation launches, at the same moments. */
const fireworksScore: SoundScore = (context, startTime, output) => {
  for (const rocket of FIREWORK_ROCKETS) playFirework(context, output, startTime + rocket.launchSeconds);
};

/** A rising run of square-wave notes. */
function playArpeggio(context: AudioContext, output: AudioNode, run: { startTime: number; notes: number[]; noteGap: number }): void {
  run.notes.forEach((frequency, index) => {
    playTone(context, output, { frequency, startTime: run.startTime + index * run.noteGap, duration: 0.3, volume: 0.25, type: "square" });
  });
}

/** A held chord. */
function playChord(context: AudioContext, output: AudioNode, chord: { startTime: number; notes: number[]; duration: number }): void {
  for (const frequency of chord.notes) {
    playTone(context, output, { frequency, startTime: chord.startTime, duration: chord.duration, volume: 0.18, type: "sawtooth" });
  }
}

/** The Ballin' Bean Club fanfare: a rising arpeggio and held chord, then a higher run and a big final chord lasting to the end. */
const clubScore: SoundScore = (context, startTime, output) => {
  playArpeggio(context, output, { startTime, notes: [NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6], noteGap: 0.14 });
  playChord(context, output, { startTime: startTime + 0.56, notes: [NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6], duration: 1.6 });
  playArpeggio(context, output, { startTime: startTime + 2.4, notes: [NOTE_G5, NOTE_C6, NOTE_E6, NOTE_G6], noteGap: 0.14 });
  coinTinkles(context, startTime + 2.9, output);
  playChord(context, output, {
    startTime: startTime + 3.2,
    notes: [NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6, NOTE_E6],
    duration: BUILT_IN_CELEBRATION_SECONDS - 3.4,
  });
};

/** Slowing reel ticks until the last reel stops. */
function playReelTicks(context: AudioContext, output: AudioNode, startTime: number): void {
  const lastStop = JACKPOT_REEL_STOP_SECONDS[JACKPOT_REEL_STOP_SECONDS.length - 1];
  let time = startTime;
  let gap = 0.05;
  while (time < startTime + lastStop) {
    playNoise(context, output, { startTime: time, duration: 0.02, volume: 0.5, filterFrequency: 3000 });
    time += gap;
    gap *= 1.045; // each tick a little later: the reels slow down
  }
}

/** The payout once the last reel lands: a rising arpeggio, a cascade of coins and a final chord. */
function playPayout(context: AudioContext, output: AudioNode, startTime: number): void {
  const arpeggio = [NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6, NOTE_E6, NOTE_G6];
  playArpeggio(context, output, { startTime, notes: arpeggio, noteGap: 0.11 });
  const cascadeSeconds = 1.8;
  const coinCount = 30;
  for (let index = 0; index < coinCount; index++) {
    const time = startTime + 0.1 + (index / coinCount) * cascadeSeconds + Math.random() * 0.03;
    const pitch = 2200 + Math.random() * 2200;
    playTone(context, output, { frequency: pitch, startTime: time, duration: 0.16, volume: 0.14 });
  }
  playNoise(context, output, { startTime, duration: cascadeSeconds, volume: 0.12, filterFrequency: 6000, filterType: "highpass" });
  const chordTime = startTime + 1.0;
  playChord(context, output, {
    startTime: chordTime,
    notes: [NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6],
    duration: BUILT_IN_CELEBRATION_SECONDS - JACKPOT_REEL_STOP_SECONDS[2] - 1.2,
  });
  cashRegister(context, startTime + 1.3, output);
}

/** Jackpot: slowing reel ticks, a ding as each reel stops, then a slot-machine payout that lasts to the end. */
const jackpotScore: SoundScore = (context, startTime, output) => {
  playReelTicks(context, output, startTime);
  [NOTE_E5, NOTE_G5, NOTE_C6].forEach((frequency, index) => {
    playTone(context, output, { frequency, startTime: startTime + JACKPOT_REEL_STOP_SECONDS[index], duration: 0.9, volume: 0.3, type: "triangle" });
  });
  playPayout(context, output, startTime + JACKPOT_REEL_STOP_SECONDS[2] + 0.1);
};

const SOUND_SCORES: Record<BuiltInCelebration, SoundScore> = {
  billsRain: billsRainScore,
  confetti: confettiScore,
  fireworks: fireworksScore,
  club: clubScore,
  jackpot: jackpotScore,
};

/**
 * Play a built-in celebration's synthesized sound, starting now.
 * @param name  which built-in celebration
 * @param context  an unlocked AudioContext (see unlockAudioContext)
 */
export function playCelebrationSound(name: BuiltInCelebration, context: AudioContext): void {
  const master = context.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(context.destination);
  SOUND_SCORES[name](context, context.currentTime + 0.02, master);
}
