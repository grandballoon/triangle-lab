// Entry point of the AR page (ar.html): one lab lesson's figure on a flat
// sheet that the learner places in the camera view as if it stood in the
// room — slid, sized, spun and leaned in perspective — to lay it over real
// things. Nothing is detected in the scene; the learner does the matching by
// eye. The lesson is the lab's own module, drawn unchanged; its stages are
// stepped through on the same sheet, which keeps its place between them.
//
// This file is the shell: it holds the pose and the lesson, turns pointers
// into handle drags or sheet gestures, and draws each frame. Where the sheet
// goes and what a gesture does to it are decided in pose.ts.

import "katex/dist/katex.min.css";
import "../nav.css";
import "../lab/lab.css";
import "./ar.css";
import { mountCameraSwitch } from "../cameraSwitch.ts";
import { startHands } from "../hands/index.ts";
import { C, Draw, toScreen, toStage, type View } from "../lab/draw.ts";
import { sub, type Vec } from "../lab/geo.ts";
import { drawGrip, drawSlider, pickRadius } from "../lab/grip.ts";
import { Scene, STAGE, type Frame, type Handle, type HandPoints, type LessonBuilder, type LessonView } from "../lab/scene.ts";
import { SpriteCache } from "../lab/sprites.ts";
import { capturePointer, releasePointer } from "../pointer.ts";
import { chapters, hrefOf, lessons } from "../lessons.ts";
import { camera, startWebcam } from "../webcam.ts";
import { StepCard } from "./card.ts";
import { arSlugOf } from "./lessons.ts";
import { PosePanel, type DragMode } from "./panel.ts";
import {
  cssMatrix,
  dragged,
  initialPose,
  project,
  pickOnScreen,
  settle,
  sheetMatrix,
  sheetResolution,
  unproject,
  zoomed,
  type Matrix,
  type Pose,
  type Size,
} from "./pose.ts";

// The sheet is the lab's stage at a fixed number of pixels per unit, so
// strokes and labels, which the lab sizes in pixels, keep their proportion to
// the figure however the sheet is sized on screen.
const UNIT_PX = 60;
const SHEET: Size = { width: 2 * STAGE.halfWidth * UNIT_PX, height: 2 * STAGE.halfHeight * UNIT_PX };
const SHEET_VIEW: View = { scale: UNIT_PX, ox: SHEET.width / 2, oy: SHEET.height / 2, ...SHEET };
// Canvases much wider than this cost more memory than they show.
const MAX_CANVAS_PX = 4096;
const STEP_FADE_SECONDS = 0.7;
const WHEEL_ZOOM = 0.0015;
const WHEEL_SPIN = 0.003;
const NARROW = 700;

const modules = import.meta.glob<{ default: LessonBuilder }>("../lab/lessons/*.ts");
const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const video = byId<HTMLVideoElement>("cam");
const canvas = byId<HTMLCanvasElement>("sheet");
const surface = byId("surface");
const ctx = canvas.getContext("2d")!;
const sprites = new SpriteCache();
canvas.style.width = `${SHEET.width}px`;
canvas.style.height = `${SHEET.height}px`;

type Hold =
  | { kind: "handle"; handle: Handle; offset: Vec }
  | { kind: "sheet"; at: Vec; lean: boolean };

interface Loaded {
  accent: string;
  build: LessonBuilder;
  scene: Scene;
  view: LessonView;
}

let lesson: Loaded | null = null;
let step = 0;
let stepShownAt = performance.now();
const loadedAt = performance.now();
let pose: Pose = initialPose(viewport(), SHEET);
let mode: DragMode = "move";
let backing = 1;
let matrix: Matrix = sheetMatrix(pose, viewport(), SHEET);
let resolution = 0;
let shownPanel = "";
const holds = new Map<number, Hold>();

/** The phone arrangement, which nav.css, hands.css and ar.css key off. */
function arrange(): void {
  const stacked = window.innerWidth < NARROW;
  if ((document.documentElement.dataset.layout === "stacked") !== stacked) {
    document.documentElement.dataset.layout = stacked ? "stacked" : "wide";
  }
}

function viewport(): Size {
  return { width: window.innerWidth, height: window.innerHeight };
}

/** A screen point measured from the middle of the viewport, as pose.ts takes them. */
function centred(e: { clientX: number; clientY: number }): Vec {
  return { x: e.clientX - window.innerWidth / 2, y: e.clientY - window.innerHeight / 2 };
}

function setPose(next: Pose): void {
  pose = settle(pose, next, viewport(), SHEET);
}

// --- Chrome ----------------------------------------------------------------------

const topbar = byId("topbar");
mountCameraSwitch(topbar);

const card = new StepCard(
  {
    root: byId("card"),
    toggle: byId<HTMLButtonElement>("card-toggle"),
    body: byId("card-body"),
    count: byId("stage-count"),
    title: byId("stage-title"),
    text: byId("stage-text"),
    stages: byId("stages"),
    readouts: byId("readouts"),
    prev: byId<HTMLButtonElement>("prev"),
    next: byId<HTMLButtonElement>("next"),
  },
  (to) => goTo(to),
);

const panel = new PosePanel(
  byId("pose"),
  byId<HTMLButtonElement>("pose-toggle"),
  byId("pose-body"),
  {
    pose: (change) => setPose(change(pose)),
    mode: (m) => (mode = m),
    backing: (amount) => (backing = amount),
    face: () => setPose({ ...pose, tilt: 0, turn: 0 }),
    reset: () => (pose = initialPose(viewport(), SHEET)),
  },
  window.innerWidth >= NARROW,
);

const hands = startHands({
  video,
  multiPointer: true,
  camera,
  onAction: (action) => {
    if (action === "next") goTo(step + 1);
    else if (action === "previous") goTo(step - 1);
    else if (action === "reset") reload();
  },
});

// --- The lesson -------------------------------------------------------------------

async function open(): Promise<void> {
  const slug = arSlugOf(location.search);
  const entry = lessons.find((l) => l.slug === slug && l.lab);
  const load = modules[`../lab/lessons/${slug}.ts`];
  if (!slug || !entry || !load) {
    location.replace("index.html");
    return;
  }
  const { default: build } = await load();
  const chapter = chapters.find((c) => c.lessons.includes(entry));
  byId("eyebrow").textContent = `${chapter?.title ?? ""} · AR`;
  byId("title").textContent = entry.name;
  byId<HTMLAnchorElement>("back").href = hrefOf(entry);
  document.title = `${entry.name} in AR · Triangle Lab`;
  document.documentElement.style.setProperty("--accent", entry.accent);
  lesson = { accent: entry.accent, build, ...built(entry.accent, build) };
  card.show(lesson.view.steps);
  goTo(0);
}

function built(accent: string, build: LessonBuilder): { scene: Scene; view: LessonView } {
  const scene = new Scene(accent);
  return { scene, view: build(scene) };
}

/** Put the figure back as it started, at the same stage and place. */
function reload(): void {
  if (!lesson) return;
  holds.clear();
  Object.assign(lesson, built(lesson.accent, lesson.build));
}

function goTo(to: number): void {
  if (!lesson || to < 0 || to >= lesson.view.steps.length) return;
  if (to !== step) stepShownAt = performance.now();
  step = to;
  card.mark(step);
}

// --- Frame ------------------------------------------------------------------------

function frame(now: number): void {
  requestAnimationFrame(frame);
  arrange();
  const view = viewport();
  matrix = sheetMatrix(pose, view, SHEET);
  canvas.style.transform = cssMatrix(matrix);

  const res = sheetResolution(pose, window.devicePixelRatio || 1, SHEET, MAX_CANVAS_PX);
  if (res !== resolution) {
    resolution = res;
    canvas.width = Math.round(SHEET.width * res);
    canvas.height = Math.round(SHEET.height * res);
  }
  ctx.setTransform(res, 0, 0, res, 0, 0);
  ctx.clearRect(0, 0, SHEET.width, SHEET.height);

  const state = { pose, mode, backing };
  if (JSON.stringify(state) !== shownPanel) {
    shownPanel = JSON.stringify(state);
    panel.show(state);
  }

  if (!lesson) return;
  const fade = Math.min(1, (now - stepShownAt) / 1000 / STEP_FADE_SECONDS);
  const eased = 1 - (1 - fade) ** 3;
  const f: Frame = {
    step,
    at: (n) => (n < step ? 1 : n === step ? eased : 0),
    time: (now - loadedAt) / 1000,
    hands: handsOnSheet(),
  };

  const g = new Draw(ctx, SHEET_VIEW, lesson.accent, { pictures: sprites });
  if (backing > 0) {
    // A tinted, ruled sheet: the figure reads over a bright room, and the
    // rulings show how the sheet lies. It fades on its own, down to nothing,
    // so the figure alone can be laid over the room.
    const { halfWidth: w, halfHeight: h } = STAGE;
    const corners = [
      { x: -w, y: -h },
      { x: w, y: -h },
      { x: w, y: h },
      { x: -w, y: h },
    ];
    g.polygon(corners, { fill: "rgba(6, 10, 16, 0.34)", stroke: null, alpha: backing });
    g.grid(1, { color: "rgba(238, 244, 251, 0.1)", alpha: backing });
    g.polygon(corners, { stroke: C.faint, width: 3, alpha: backing });
  }
  lesson.view.draw(g, f);
  for (const s of lesson.scene.sliders) drawSlider(g, s);
  for (const h of lesson.scene.handles) drawGrip(ctx, g, h);
  card.readouts(lesson.view.readout?.(f) ?? []);
}

/** The hands seen, on the sheet's stage; a hand partly off the sheet's plane is left out. */
function handsOnSheet(): HandPoints[] {
  return hands.frames().flatMap((h) => {
    const points = h.screen.map((p) => unproject(matrix, p));
    return points.every((p) => p !== null)
      ? [{ side: h.side, points: points.map((p) => toStage(SHEET_VIEW, p)) }]
      : [];
  });
}

// --- Pointers -----------------------------------------------------------------------

/** The stage point under a screen point, if the line of sight meets the sheet's plane. */
function stageAt(e: PointerEvent): Vec | null {
  const p = unproject(matrix, { x: e.clientX, y: e.clientY });
  return p ? toStage(SHEET_VIEW, p) : null;
}

/** The handle under the pointer, picked by where it shows on screen, so a far one is no easier to catch. */
function handleAt(e: PointerEvent): Handle | null {
  if (!lesson) return null;
  const { handles } = lesson.scene;
  const grips = handles.map((h) => {
    const seen = project(matrix, toScreen(SHEET_VIEW, h));
    return { at: seen.w > 0 ? seen.at : null, enabled: h.enabled && !h.grabbed };
  });
  const i = pickOnScreen(grips, { x: e.clientX, y: e.clientY }, pickRadius(e.pointerType));
  return i === -1 ? null : handles[i];
}

surface.addEventListener("pointerdown", (e) => {
  const handle = handleAt(e);
  const at = stageAt(e);
  if (handle && at) {
    handle.grabbed = true;
    holds.set(e.pointerId, { kind: "handle", handle, offset: sub(handle, at) });
  } else {
    // The other button, or Shift, does the other thing to the sheet.
    const other = e.button === 2 || e.shiftKey;
    holds.set(e.pointerId, { kind: "sheet", at: centred(e), lean: (mode === "lean") !== other });
  }
  capturePointer(surface, e);
  surface.classList.add("grabbing");
});

surface.addEventListener("pointermove", (e) => {
  const hold = holds.get(e.pointerId);
  if (!hold) {
    const over = handleAt(e);
    for (const h of lesson?.scene.handles ?? []) h.hover = h === over;
    surface.classList.toggle("can-grab", over !== null);
    return;
  }
  if (hold.kind === "handle") {
    const at = stageAt(e);
    if (at) hold.handle.set({ x: at.x + hold.offset.x, y: at.y + hold.offset.y });
    return;
  }
  const to = centred(e);
  const others = [...holds.entries()]
    .filter(([id, h]) => id !== e.pointerId && h.kind === "sheet")
    .map(([, h]) => (h as { at: Vec }).at);
  setPose(dragged(pose, hold.at, to, others, hold.lean));
  hold.at = to;
});

function release(e: PointerEvent): void {
  const hold = holds.get(e.pointerId);
  if (!hold) return;
  if (hold.kind === "handle") hold.handle.grabbed = false;
  holds.delete(e.pointerId);
  releasePointer(surface, e);
  if (holds.size === 0) surface.classList.remove("grabbing");
}

surface.addEventListener("pointerup", release);
surface.addEventListener("pointercancel", release);
surface.addEventListener("contextmenu", (e) => e.preventDefault());

// A wheel or a trackpad pinch sizes the sheet about the pointer; with Shift it spins.
surface.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const delta = e.deltaY || e.deltaX;
    if (e.shiftKey) setPose({ ...pose, spin: pose.spin - delta * WHEEL_SPIN });
    else setPose(zoomed(pose, Math.exp(-delta * WHEEL_ZOOM * (e.ctrlKey ? 4 : 1)), centred(e)));
  },
  { passive: false },
);

window.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === "ArrowRight") goTo(step + 1);
  else if (e.key === "ArrowLeft") goTo(step - 1);
  else if (e.key === "r" || e.key === "R") reload();
  else if (e.key === "0") pose = initialPose(viewport(), SHEET);
});

void startWebcam(video);
void open();
requestAnimationFrame(frame);
