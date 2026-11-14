/**
 * The canvas animations behind the celebrations: falling dollar bills, 
 * confetti bursts and fireworks. Drawn with plain canvas shapes (no images),
 * so everything is original and nothing is downloaded.
 *
 * Nothing flashes: every effect is moving shapes on a transparent canvas,
 * with no full-screen colour change, so it stays well under three flashes
 * a second.
 */

import {
  CONFETTI_BURSTS,
  FIREWORK_FLIGHT_SECONDS,
  FIREWORK_ROCKETS,
  JACKPOT_BILLS_START_SECONDS,
} from "./CelebrationTimings";

export type ParticleShow = "billsRain" | "jackpotBills" | "confetti" | "fireworks";

type ParticleShape = "bill" | "confetti" | "spark" | "rocket";

/** A point a rocket has passed through, for its trail. */
interface TrailPoint {
  x: number;
  y: number;
}

interface Particle {
  shape: ParticleShape;
  x: number;
  y: number;
  velocityX: number; // pixels per second
  velocityY: number;
  rotation: number; // radians
  spin: number; // radians per second
  size: number; // pixels (a bill's width)
  color: string;
  age: number; // seconds alive
  lifetime: number; // seconds until gone
  wobblePhase: number;
  trail?: TrailPoint[]; // a rocket's recent positions, newest last
  burstColor?: string; // a rocket's colour for the burst it ends in
}

interface ShowState {
  particles: Particle[];
  elapsedSeconds: number;
  nextBurstIndex: number; // confetti bursts or firework rockets launched so far
  spawnedBills: number;
}

/** Everything one running show needs each frame. */
interface ShowRun {
  state: ShowState;
  definition: ShowDefinition;
  area: ShowArea;
}

/** The screen a show plays on and the app's accent colour. */
interface ShowArea {
  width: number;
  height: number;
  accentColor: string;
}

interface ShowDefinition {
  gravity: number; // pixels per second squared
  drag: number; // fraction of speed kept each second (1 = none)
  spawn: (state: ShowState, area: ShowArea) => void;
}

const BILL_COLORS = ["#2e7d32", "#388e3c", "#43a047", "#2f6f3a"];
const CONFETTI_COLORS = ["#ff5252", "#ffd740", "#69f0ae", "#40c4ff", "#e040fb", "#ffffff"];
const FIREWORK_COLORS = ["#ff5252", "#ffd740", "#69f0ae", "#40c4ff", "#e040fb"];
const BILL_HEIGHT_RATIO = 0.45; // a bill is a little under half as tall as wide
const CONFETTI_PER_BURST = 50;
const FIREWORK_SPARKS = 70;
const TRAIL_LENGTH = 16; // positions kept for a rocket's trail
const TRAIL_WIDTH = 3;
const ROCKET_COLOR = "#fff3c4";
const ROCKET_SIZE = 3;
const FADE_OUT_FRACTION = 0.3; // last part of a particle's life spent fading

function randomBetween(minimum: number, maximum: number): number {
  return minimum + Math.random() * (maximum - minimum);
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** A dollar bill released above the top edge, drifting down and tumbling. */
function createBill(width: number): Particle {
  return {
    shape: "bill",
    x: randomBetween(0, width),
    y: randomBetween(-160, -40),
    velocityX: randomBetween(-20, 20),
    velocityY: randomBetween(90, 190),
    rotation: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-2.2, 2.2),
    size: randomBetween(46, 70),
    color: randomItem(BILL_COLORS),
    age: 0,
    lifetime: 8, // far longer than a show: bills are removed when off screen
    wobblePhase: randomBetween(0, Math.PI * 2),
  };
}

/** When and how many bills a falling-bills show releases. */
interface BillRelease {
  count: number;
  startSeconds: number; // the first bill appears now (0) or later (over the jackpot)
  spreadSeconds: number; // bills are released over this long, not all at once
}

/** A spawner that releases the bills gradually, as the release says. */
function billSpawner(release: BillRelease): (state: ShowState, area: ShowArea) => void {
  return (state, area) => {
    const secondsIn = state.elapsedSeconds - release.startSeconds;
    if (secondsIn < 0) return;
    const dueByNow = Math.min(release.count, Math.floor((secondsIn / release.spreadSeconds) * release.count) + 1);
    while (state.spawnedBills < dueByNow) {
      state.particles.push(createBill(area.width));
      state.spawnedBills++;
    }
  };
}

/** One confetti piece popped outward from a burst's centre, mostly upward. */
function createConfettiPiece(x: number, y: number, accentColor: string): Particle {
  const angle = randomBetween(-Math.PI * 0.95, -Math.PI * 0.05); // an upward fan
  const speed = randomBetween(220, 620);
  return {
    shape: "confetti",
    x,
    y,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
    rotation: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-9, 9),
    size: randomBetween(7, 13),
    color: randomItem([...CONFETTI_COLORS, accentColor]),
    age: 0,
    lifetime: randomBetween(3, 4.5), // long enough to drift down until the next burst
    wobblePhase: randomBetween(0, Math.PI * 2),
  };
}

/** Pop each confetti burst when its time comes: the first near the bottom, each next one higher. */
function spawnConfettiBursts(state: ShowState, area: ShowArea): void {
  const burst = CONFETTI_BURSTS[state.nextBurstIndex];
  if (burst === undefined || state.elapsedSeconds < burst.atSeconds) return;
  state.nextBurstIndex++;
  const centreX = area.width * burst.widthFraction;
  const centreY = area.height * burst.heightFraction;
  for (let index = 0; index < CONFETTI_PER_BURST; index++) {
    state.particles.push(createConfettiPiece(centreX, centreY, area.accentColor));
  }
}

/** One spark of a firework burst, flying out from the burst's centre. */
function createSpark(x: number, y: number, color: string): Particle {
  const angle = randomBetween(0, Math.PI * 2);
  const speed = randomBetween(60, 340);
  return {
    shape: "spark",
    x,
    y,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
    rotation: 0,
    spin: 0,
    size: randomBetween(2, 3.5),
    color,
    age: 0,
    lifetime: randomBetween(1, 1.6),
    wobblePhase: 0,
  };
}

/** A rocket flying straight up from the bottom edge to where it will burst, leaving a trail. */
function createRocket(launch: { x: number; targetY: number; color: string }, area: ShowArea): Particle {
  const { x, targetY, color } = launch;
  return {
    shape: "rocket",
    x,
    y: area.height,
    velocityX: 0,
    velocityY: -(area.height - targetY) / FIREWORK_FLIGHT_SECONDS,
    rotation: 0,
    spin: 0,
    size: ROCKET_SIZE,
    color: ROCKET_COLOR,
    age: 0,
    lifetime: FIREWORK_FLIGHT_SECONDS,
    wobblePhase: 0,
    trail: [],
    burstColor: color,
  };
}

/** Launch each rocket when its time comes (it bursts where it arrives, see burstArrivedRockets). */
function spawnFireworks(state: ShowState, area: ShowArea): void {
  const rocket = FIREWORK_ROCKETS[state.nextBurstIndex];
  if (rocket === undefined || state.elapsedSeconds < rocket.launchSeconds) return;
  state.nextBurstIndex++;
  const x = area.width * rocket.widthFraction;
  const targetY = area.height * rocket.burstHeightFraction;
  state.particles.push(createRocket({ x, targetY, color: randomItem(FIREWORK_COLORS) }, area));
}

/** Burst every rocket that has arrived: a ball of sparks where the rocket was. */
function burstArrivedRockets(state: ShowState): void {
  const arrived = state.particles.filter((particle) => particle.shape === "rocket" && particle.age >= particle.lifetime);
  for (const rocket of arrived) {
    for (let index = 0; index < FIREWORK_SPARKS; index++) {
      state.particles.push(createSpark(rocket.x, rocket.y, rocket.burstColor ?? randomItem(FIREWORK_COLORS)));
    }
  }
}

const BILLS_RAIN_RELEASE: BillRelease = { count: 90, startSeconds: 0, spreadSeconds: 4.5 }; // keeps bills falling through the 6 seconds
const JACKPOT_BILLS_RELEASE: BillRelease = { count: 40, startSeconds: JACKPOT_BILLS_START_SECONDS, spreadSeconds: 2 };

const SHOWS: Record<ParticleShow, ShowDefinition> = {
  billsRain: { gravity: 0, drag: 1, spawn: billSpawner(BILLS_RAIN_RELEASE) },
  jackpotBills: { gravity: 0, drag: 1, spawn: billSpawner(JACKPOT_BILLS_RELEASE) },
  confetti: { gravity: 170, drag: 0.4, spawn: spawnConfettiBursts },
  fireworks: { gravity: 140, drag: 0.25, spawn: spawnFireworks },
};

/** Move one particle forward; a rocket flies straight (no gravity or drag) and adds to its trail. */
function stepParticle(particle: Particle, definition: ShowDefinition, seconds: number): void {
  particle.age += seconds;
  if (particle.shape === "rocket") {
    particle.trail?.push({ x: particle.x, y: particle.y });
    if ((particle.trail?.length ?? 0) > TRAIL_LENGTH) particle.trail?.shift();
    particle.y += particle.velocityY * seconds;
    return;
  }
  const speedKept = Math.pow(definition.drag, seconds);
  particle.velocityY += definition.gravity * seconds;
  particle.velocityX *= speedKept;
  particle.velocityY *= particle.shape === "bill" ? 1 : speedKept;
  particle.x += particle.velocityX * seconds;
  particle.y += particle.velocityY * seconds;
  particle.rotation += particle.spin * seconds;
}

/** Move every particle forward by a time step, burst the rockets that arrived, and drop the ones that are done. */
function stepParticles(run: ShowRun, seconds: number): void {
  const { state, definition, area } = run;
  for (const particle of state.particles) stepParticle(particle, definition, seconds);
  burstArrivedRockets(state);
  state.particles = state.particles.filter(
    (particle) => particle.age < particle.lifetime && particle.y < area.height + 120,
  );
}

/** A dollar bill: green rounded rectangle, inner border and a "$" medallion. */
function drawBill(context: CanvasRenderingContext2D, particle: Particle): void {
  const width = particle.size;
  const height = width * BILL_HEIGHT_RATIO;
  const flip = Math.cos(particle.age * 3 + particle.wobblePhase); // tumbling in 3D: squash the height
  context.rotate(particle.rotation * 0.35);
  context.scale(1, 0.35 + 0.65 * Math.abs(flip));
  context.fillStyle = particle.color;
  context.beginPath();
  context.roundRect(-width / 2, -height / 2, width, height, 3);
  context.fill();
  context.strokeStyle = "rgba(255, 255, 255, 0.55)";
  context.lineWidth = 1.5;
  context.strokeRect(-width / 2 + 4, -height / 2 + 4, width - 8, height - 8);
  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.font = `bold ${Math.round(height * 0.6)}px sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("$", 0, 1);
}

/** A confetti piece: a small rectangle that flutters as it spins. */
function drawConfetti(context: CanvasRenderingContext2D, particle: Particle): void {
  context.rotate(particle.rotation);
  context.scale(1, Math.abs(Math.cos(particle.age * 6 + particle.wobblePhase)) * 0.8 + 0.2);
  context.fillStyle = particle.color;
  context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
}

/** A firework spark: a bright dot. */
function drawSpark(context: CanvasRenderingContext2D, particle: Particle): void {
  context.fillStyle = particle.color;
  context.shadowColor = particle.color;
  context.shadowBlur = 8;
  context.beginPath();
  context.arc(0, 0, particle.size, 0, Math.PI * 2);
  context.fill();
}

/** A rocket's trail: short strokes behind the head, the older the fainter (drawn relative to the head, which is the origin). */
function drawTrail(context: CanvasRenderingContext2D, particle: Particle): void {
  const trail = particle.trail ?? [];
  context.lineCap = "round";
  context.lineWidth = TRAIL_WIDTH;
  context.strokeStyle = particle.burstColor ?? ROCKET_COLOR;
  trail.forEach((point, index) => {
    const next = trail[index + 1] ?? { x: particle.x, y: particle.y };
    context.globalAlpha = (index + 1) / (trail.length + 1);
    context.beginPath();
    context.moveTo(point.x - particle.x, point.y - particle.y);
    context.lineTo(next.x - particle.x, next.y - particle.y);
    context.stroke();
  });
  context.globalAlpha = 1;
}

/** A rocket: a fading trail behind a bright head. */
function drawRocket(context: CanvasRenderingContext2D, particle: Particle): void {
  drawTrail(context, particle);
  context.fillStyle = particle.color;
  context.beginPath();
  context.arc(0, 0, particle.size, 0, Math.PI * 2);
  context.fill();
}

const DRAWERS: Record<ParticleShape, (context: CanvasRenderingContext2D, particle: Particle) => void> = {
  bill: drawBill,
  confetti: drawConfetti,
  spark: drawSpark,
  rocket: drawRocket,
};

/** Draw every particle, fading each out over the end of its life. */
function drawParticles(context: CanvasRenderingContext2D, state: ShowState): void {
  for (const particle of state.particles) {
    const lifeLeft = 1 - particle.age / particle.lifetime;
    context.save();
    context.globalAlpha = particle.shape === "rocket" ? 1 : Math.min(1, lifeLeft / FADE_OUT_FRACTION); // a rocket is drawn at full strength until it bursts
    context.translate(particle.x, particle.y);
    DRAWERS[particle.shape](context, particle);
    context.restore();
  }
}

/**
 * Size the canvas backing store for the screen's pixel density. The show
 * fills the canvas as laid out (the whole screen on the phone, a phone-shaped
 * frame in the console's preview); a canvas with no layout size (tests) falls
 * back to the window.
 */
function fitCanvas(canvas: HTMLCanvasElement): { width: number; height: number } {
  const ratio = window.devicePixelRatio || 1;
  const box = canvas.getBoundingClientRect();
  const width = box.width > 0 ? box.width : window.innerWidth;
  const height = box.height > 0 ? box.height : window.innerHeight;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height };
}

/** Advance a show by the time since the last frame, then redraw it. */
function renderFrame(context: CanvasRenderingContext2D, run: ShowRun, seconds: number): void {
  run.state.elapsedSeconds += seconds;
  run.definition.spawn(run.state, run.area);
  stepParticles(run, seconds);
  context.clearRect(0, 0, run.area.width, run.area.height);
  drawParticles(context, run.state);
}

/** A show that has not started yet: no particles, its own clock at zero. */
function createShowRun(show: ParticleShow, area: ShowArea): ShowRun {
  const state: ShowState = { particles: [], elapsedSeconds: 0, nextBurstIndex: 0, spawnedBills: 0 };
  return { state, definition: SHOWS[show], area };
}

/**
 * Run a particle show on a canvas until stopped.
 * @param canvas  a full-screen canvas
 * @param show  which show to run
 * @param accentColor  the app's accent colour, mixed into the confetti
 * @returns a function that stops the animation and clears the canvas
 */
export function startParticleShow(
  canvas: HTMLCanvasElement,
  show: ParticleShow,
  accentColor: string,
): () => void {
  const context = canvas.getContext("2d");
  if (context === null) return () => {};
  const run = createShowRun(show, { ...fitCanvas(canvas), accentColor });
  let lastTimestamp: number | null = null;
  let frameHandle = 0;

  const drawFrame = (timestamp: number) => {
    // The first frame has no previous one; long gaps (a background tab) are capped.
    const seconds = lastTimestamp === null ? 0 : Math.min((timestamp - lastTimestamp) / 1000, 0.05);
    lastTimestamp = timestamp;
    renderFrame(context, run, seconds);
    frameHandle = requestAnimationFrame(drawFrame);
  };
  frameHandle = requestAnimationFrame(drawFrame);

  return () => {
    cancelAnimationFrame(frameHandle);
    context.clearRect(0, 0, run.area.width, run.area.height);
  };
}
