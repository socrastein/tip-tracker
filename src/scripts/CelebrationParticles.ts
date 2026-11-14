/**
 * The canvas animations behind the celebrations: falling dollar bills, a
 * confetti burst and fireworks. Drawn with plain canvas shapes (no images),
 * so everything is original and nothing is downloaded.
 *
 * Nothing flashes: every effect is moving shapes on a transparent canvas,
 * with no full-screen colour change, so it stays well under three flashes
 * a second.
 */

export type ParticleShow = "billsRain" | "confetti" | "fireworks";

type ParticleShape = "bill" | "confetti" | "spark";

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
}

interface ShowState {
  particles: Particle[];
  elapsedSeconds: number;
  nextBurstIndex: number; // fireworks launched so far
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
const BILL_COUNT = 46;
const BILL_SPAWN_SECONDS = 2; // bills are released over this long, not all at once
const BILL_HEIGHT_RATIO = 0.45; // a bill is a little under half as tall as wide
const CONFETTI_COUNT = 140;
const FIREWORK_LAUNCH_SECONDS = [0.1, 1, 1.9]; // matches the three booms in CelebrationSounds
const FIREWORK_SPARKS = 70;
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

/** Release the bills gradually over the first couple of seconds. */
function spawnBills(state: ShowState, area: ShowArea): void {
  const dueByNow = Math.min(
    BILL_COUNT,
    Math.floor((state.elapsedSeconds / BILL_SPAWN_SECONDS) * BILL_COUNT) + 1,
  );
  while (state.spawnedBills < dueByNow) {
    state.particles.push(createBill(area.width));
    state.spawnedBills++;
  }
}

/** One confetti piece thrown up and outward from a launch point. */
function createConfettiPiece(x: number, y: number, accentColor: string): Particle {
  const angle = randomBetween(-Math.PI * 0.85, -Math.PI * 0.15); // upward fan
  const speed = randomBetween(350, 900);
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
    lifetime: randomBetween(2.4, 3.6),
    wobblePhase: randomBetween(0, Math.PI * 2),
  };
}

/** Throw all the confetti at once from the bottom corners and middle. */
function spawnConfettiBurst(state: ShowState, area: ShowArea): void {
  if (state.nextBurstIndex > 0) return; // one burst only
  state.nextBurstIndex = 1;
  const launchPoints = [area.width * 0.1, area.width * 0.5, area.width * 0.9];
  for (let index = 0; index < CONFETTI_COUNT; index++) {
    const launchX = launchPoints[index % launchPoints.length];
    state.particles.push(createConfettiPiece(launchX, area.height, area.accentColor));
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

/** Launch each firework burst when its time comes, in the upper half of the screen. */
function spawnFireworks(state: ShowState, area: ShowArea): void {
  const nextLaunch = FIREWORK_LAUNCH_SECONDS[state.nextBurstIndex];
  if (nextLaunch === undefined || state.elapsedSeconds < nextLaunch) return;
  state.nextBurstIndex++;
  const centreX = randomBetween(area.width * 0.2, area.width * 0.8);
  const centreY = randomBetween(area.height * 0.15, area.height * 0.45);
  const color = randomItem(FIREWORK_COLORS);
  for (let index = 0; index < FIREWORK_SPARKS; index++) {
    state.particles.push(createSpark(centreX, centreY, color));
  }
}

const SHOWS: Record<ParticleShow, ShowDefinition> = {
  billsRain: { gravity: 0, drag: 1, spawn: spawnBills },
  confetti: { gravity: 900, drag: 0.35, spawn: spawnConfettiBurst },
  fireworks: { gravity: 140, drag: 0.25, spawn: spawnFireworks },
};

/** Move every particle forward by a time step and drop the ones that are done. */
function stepParticles(run: ShowRun, seconds: number): void {
  const { state, definition, area } = run;
  const speedKept = Math.pow(definition.drag, seconds);
  for (const particle of state.particles) {
    particle.age += seconds;
    particle.velocityY += definition.gravity * seconds;
    particle.velocityX *= speedKept;
    particle.velocityY *= particle.shape === "bill" ? 1 : speedKept;
    particle.x += particle.velocityX * seconds;
    particle.y += particle.velocityY * seconds;
    particle.rotation += particle.spin * seconds;
  }
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

const DRAWERS: Record<ParticleShape, (context: CanvasRenderingContext2D, particle: Particle) => void> = {
  bill: drawBill,
  confetti: drawConfetti,
  spark: drawSpark,
};

/** Draw every particle, fading each out over the end of its life. */
function drawParticles(context: CanvasRenderingContext2D, state: ShowState): void {
  for (const particle of state.particles) {
    const lifeLeft = 1 - particle.age / particle.lifetime;
    context.save();
    context.globalAlpha = Math.min(1, lifeLeft / FADE_OUT_FRACTION);
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
