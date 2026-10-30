// The things a learner can touch, as the page shows them: a ring round each
// draggable point and a track under each slider. The lab shell and the AR
// page draw them alike, and catch presses on them alike, so a figure's grips
// look and feel the same wherever it is shown.

import { C, tint, toScreen, type Draw } from "./draw.ts";
import type { Handle, Slider } from "./scene.ts";

// How close a press must land to grab a handle, in screen pixels. A pinch is
// far less precise than a mouse, so hands get a wider catch.
const PICK_RADIUS_PX: Record<string, number> = { mouse: 24, pen: 24, touch: 36, hand: 46 };

/** How far from a handle, in screen pixels, a press of this pointer type still grabs it. */
export const pickRadius = (pointerType: string): number => PICK_RADIUS_PX[pointerType] ?? PICK_RADIUS_PX.touch;

/** A handle's ring, or a plain point when it is frozen. */
export function drawGrip(ctx: CanvasRenderingContext2D, g: Draw, h: Handle): void {
  if (h.hidden) return;
  const color = h.color ?? g.accent;
  if (!h.enabled) {
    g.point(h, { color, label: h.label });
    return;
  }
  const s = toScreen(g.view, h);
  const active = h.grabbed || h.hover;
  ctx.save();
  ctx.beginPath();
  ctx.arc(s.x, s.y, active ? 17 : 13, 0, Math.PI * 2);
  ctx.fillStyle = tint(color, h.grabbed ? 0.45 : active ? 0.32 : 0.2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s.x, s.y, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = h.grabbed ? "#ffffff" : color;
  ctx.fill();
  ctx.restore();
  if (h.label) g.label(h, h.label, { color, dx: 18, dy: 18, bold: true });
}

/** A slider's track, filled up to its knob, and its label and value. */
export function drawSlider(g: Draw, s: Slider): void {
  const color = g.accent;
  const active = s.knob.grabbed || s.knob.hover;
  g.segment(s.a, s.b, { color: C.faint, width: 6 });
  g.segment(s.a, s.knob, { color, width: 6 });
  g.circle(s.knob, g.px(active ? 13 : 10), { fill: color, stroke: "#ffffff", width: 2 });
  g.label(s.a, s.text, { align: "left", dy: 22, size: 14 });
}
