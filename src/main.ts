// Bootstraps the "Classifying · One: Angles" lesson: a webcam background, a Canvas
// overlay, and a draggable-apex triangle whose type you feel change under your
// hand. Geometry lives in geometry.ts; drawing in render.ts; this file owns the
// device, the layout, the pointer/snap interaction, and the animation loop.

import {
  analyze,
  clamp,
  dist,
  resolveApex,
  type Triangle,
  type Vec,
} from "./geometry.ts";
import { render, SPLASH_LIFE, type Scene, type Splash } from "./render.ts";
import { startWebcam } from "./webcam.ts";

const video = document.getElementById("cam") as HTMLVideoElement;
const canvas = document.getElementById("stage") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// --- Layout (all in CSS pixels) -----------------------------------------

let W = 0;
let H = 0;
let base: { a: Vec; b: Vec } = { a: { x: 0, y: 0 }, b: { x: 0, y: 0 } };

// The triangle. Base vertices are recomputed on resize; the apex is the only
// point the user moves.
const triangle: Triangle = { a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, c: { x: 0, y: 0 } };

let knob: Vec = { x: 0, y: 0 };
let dragging = false;
let snapped = false;
let splashes: Splash[] = [];
let lastType: string | null = null;

const GRAB_RADIUS = 34;
const TOP_MARGIN = 64;
const APEX_MIN_GAP = 24; // keep the apex this far above the base
const SIDE_MARGIN = 40; // apex may roam past the base (obtuse base angles), on-screen

function layout(): void {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const half = Math.min(W, H) * 0.24;
  const baseY = H * 0.6;
  const cx = W / 2;
  base = { a: { x: cx - half, y: baseY }, b: { x: cx + half, y: baseY } };
  triangle.a = base.a;
  triangle.b = base.b;

  // On first layout, seed an acute triangle; afterwards keep the apex where it
  // was, just re-clamped into the new bounds.
  if (lastType === null) triangle.c = { x: cx, y: baseY - half * 1.7 };
  triangle.c = clampApex(triangle.c);
  if (!dragging) knob = triangle.c;
}

function clampApex(p: Vec): Vec {
  // x is free to travel beyond the base span so either base angle can open past
  // 90°; only the screen edges and the base line itself hold it in.
  return {
    x: clamp(p.x, SIDE_MARGIN, W - SIDE_MARGIN),
    y: clamp(p.y, TOP_MARGIN, base.b.y - APEX_MIN_GAP),
  };
}

// --- Pointer interaction -------------------------------------------------

function pointerPos(e: PointerEvent): Vec {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("pointerdown", (e) => {
  const p = pointerPos(e);
  if (dist(p, triangle.c) <= GRAB_RADIUS || dist(p, knob) <= GRAB_RADIUS) {
    dragging = true;
    canvas.classList.add("grabbing");
    canvas.setPointerCapture(e.pointerId);
    updateApex(p);
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (dragging) updateApex(pointerPos(e));
});

function endDrag(e: PointerEvent): void {
  if (!dragging) return;
  dragging = false;
  canvas.classList.remove("grabbing");
  canvas.releasePointerCapture(e.pointerId);
  knob = triangle.c; // handle settles back onto the vertex
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);

/** Move the apex toward a raw pointer position, applying the Thales snap. The
 *  knob follows the raw pointer, so while snapped it rides ahead of the pinned
 *  apex — the visible "give". */
function updateApex(raw: Vec): void {
  const target = clampApex(raw);
  const result = resolveApex(target, base.a, base.b, snapped);
  snapped = result.snapped;
  triangle.c = clampApex(result.apex);
  knob = target;
}

// --- Animation loop ------------------------------------------------------

let prev = performance.now();

function frame(now: number): void {
  const dt = (now - prev) / 1000;
  prev = now;

  const angles = analyze(triangle);

  // Fire a splash the instant the triangle becomes right-angled.
  if (angles.type === "right" && lastType !== "right") {
    splashes.push({ center: { ...triangle.c }, age: 0 });
  }
  lastType = angles.type;

  splashes = splashes.filter((s) => (s.age += dt) < SPLASH_LIFE);

  const scene: Scene = { triangle, angles, knob, dragging, snapped, splashes };
  render(ctx, W, H, scene);
  requestAnimationFrame(frame);
}

// --- Go ------------------------------------------------------------------

window.addEventListener("resize", layout);
layout();
startWebcam(video);
requestAnimationFrame(frame);
