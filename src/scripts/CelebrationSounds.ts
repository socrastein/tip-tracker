import type { CelebrationName } from "./CelebrationRotation";

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

/** Bills rain: a soft whoosh under the cash register and tinkling coins. */
const billsRainScore: SoundScore = (context, startTime, output) => {
  playNoise(context, output, { startTime, duration: 1.4, volume: 0.25, filterFrequency: 900 });
  cashRegister(context, startTime + 0.1, output);
  coinTinkles(context, startTime + 0.9, output);
};

/** Confetti: a party-popper bang, then the cash register. */
const confettiScore: SoundScore = (context, startTime, output) => {
  playNoise(context, output, { startTime, duration: 0.18, volume: 0.9, filterFrequency: 1200 });
  playGlide(context, output, { fromFrequency: 220, toFrequency: 60, startTime, duration: 0.2, volume: 0.6 });
  cashRegister(context, startTime + 0.3, output);
};

/** One firework: a rising whistle, a boom, and crackling sparks. */
function playFirework(context: AudioContext, output: AudioNode, startTime: number): void {
  const whistleSeconds = 0.5;
  playGlide(context, output, { fromFrequency: 500, toFrequency: 1800, startTime, duration: whistleSeconds, volume: 0.12 });
  const boomTime = startTime + whistleSeconds;
  playNoise(context, output, { startTime: boomTime, duration: 0.7, volume: 0.9, filterFrequency: 300, filterType: "lowpass" });
  playGlide(context, output, { fromFrequency: 160, toFrequency: 35, startTime: boomTime, duration: 0.5, volume: 0.8 });
  const crackleCount = 12;
  for (let index = 0; index < crackleCount; index++) {
    const time = boomTime + 0.15 + Math.random() * 0.8;
    playNoise(context, output, { startTime: time, duration: 0.03, volume: 0.3, filterFrequency: 5000, filterType: "highpass" });
  }
}

/** Fireworks: three bursts, matching the three the animation launches. */
const fireworksScore: SoundScore = (context, startTime, output) => {
  const burstTimes = [0, 0.9, 1.8];
  for (const offset of burstTimes) playFirework(context, output, startTime + offset);
};

/** The "600 Club" fanfare: a rising major arpeggio ending on a held chord. */
const clubScore: SoundScore = (context, startTime, output) => {
  const arpeggio = [NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6];
  arpeggio.forEach((frequency, index) => {
    playTone(context, output, { frequency, startTime: startTime + index * 0.14, duration: 0.3, volume: 0.25, type: "square" });
  });
  const chordTime = startTime + arpeggio.length * 0.14;
  for (const frequency of [NOTE_C5, NOTE_E5, NOTE_G5, NOTE_C6]) {
    playTone(context, output, { frequency, startTime: chordTime, duration: 1.6, volume: 0.18, type: "sawtooth" });
  }
};

/** Jackpot: slowing reel ticks, three dings as the reels stop, then coins. */
const jackpotScore: SoundScore = (context, startTime, output) => {
  let time = startTime;
  let gap = 0.05;
  while (time < startTime + 1.6) {
    playNoise(context, output, { startTime: time, duration: 0.02, volume: 0.5, filterFrequency: 3000 });
    time += gap;
    gap *= 1.12; // each tick a little later: the reels slow down
  }
  [NOTE_E5, NOTE_G5, NOTE_C6].forEach((frequency, index) => {
    playTone(context, output, { frequency, startTime: startTime + 1.7 + index * 0.35, duration: 0.9, volume: 0.3, type: "triangle" });
  });
  coinTinkles(context, startTime + 2.5, output);
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
