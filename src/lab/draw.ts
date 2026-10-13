// The drawing vocabulary of lab lessons: segments, circles, angle marks,
// labels — the marks a geometry diagram is made of. Positions are in stage
// coordinates (y up, radians counter-clockwise); sizes that are about
// legibility rather than geometry (stroke widths, arc-mark radii, label
// offsets, fonts) are in screen pixels, so a figure reads the same at any
// window size.

import { add, angleOf, lerp, normalize, perp, polar, scale, sub, TAU, toDeg, type Vec } from "./geo.ts";

/** How stage coordinates land on the canvas. */
export interface View {
  /** Screen pixels per stage unit. */
  scale: number;
  /** Screen position of the stage origin. */
  ox: number;
  oy: number;
  width: number;
  height: number;
}

export const toScreen = (v: View, p: Vec): Vec => ({ x: v.ox + p.x * v.scale, y: v.oy - p.y * v.scale });
export const toStage = (v: View, p: Vec): Vec => ({ x: (p.x - v.ox) / v.scale, y: (v.oy - p.y) / v.scale });

/** The palette. Lessons colour by meaning, not by taste. */
export const C = {
  ink: "#eef4fb",
  dim: "rgba(238, 244, 251, 0.45)",
  faint: "rgba(238, 244, 251, 0.18)",
  gold: "#ffd43b",
  red: "#ff6b6b",
  green: "#38d9a9",
  blue: "#60a5fa",
  violet: "#c084fc",
  pink: "#f472b6",
  orange: "#fb923c",
  cyan: "#22d3ee",
} as const;

/** A colour at reduced opacity. Accepts #rrggbb; other formats pass through. */
export function tint(color: string, alpha: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(color)) return color;
  const n = parseInt(color.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export interface Stroke {
  color?: string;
  /** Screen pixels. */
  width?: number;
  /** Dash pattern in screen pixels. */
  dash?: number[];
  /** Whole-mark opacity, e.g. `f.at(2)` to fade a construction in. */
  alpha?: number;
}

export interface Fill extends Stroke {
  fill?: string;
  /** Pass null to fill without an outline. */
  stroke?: string | null;
}

export interface LabelOptions {
  color?: string;
  /** Font size in screen pixels. */
  size?: number;
  /** Offset from the anchor in screen pixels, x right and y up. */
  dx?: number;
  dy?: number;
  align?: "left" | "center" | "right";
  bold?: boolean;
  alpha?: number;
}

export interface AngleOptions extends Stroke {
  /** Arc radius in screen pixels. */
  r?: number;
  /** Text beside the arc; `true` prints the measure in degrees. */
  label?: string | boolean;
  /** Shade the wedge. */
  fill?: boolean;
  /** Draw this many concentric arcs, to mark equal angles alike. */
  arcs?: 1 | 2 | 3;
  /** Draw a square corner when the angle is 90° (default true). */
  square?: boolean;
}

/** An axis number, with a true minus sign and no float noise. */
const tick = (n: number): string => String(Math.round(n * 1e6) / 1e6).replace("-", "−");

const FONT = "ui-sans-serif, system-ui, -apple-system, sans-serif";
const HALO = "rgba(6, 10, 16, 0.78)";
const RIGHT_ANGLE_TOLERANCE = 0.6; // degrees

export class Draw {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    readonly view: View,
    /** The lesson's colour. */
    readonly accent: string,
  ) {}

  /** Stage units covered by `pixels` screen pixels. */
  px(pixels: number): number {
    return pixels / this.view.scale;
  }

  /** The visible part of the stage. */
  get bounds(): { xmin: number; xmax: number; ymin: number; ymax: number } {
    const tl = toStage(this.view, { x: 0, y: 0 });
    const br = toStage(this.view, { x: this.view.width, y: this.view.height });
    return { xmin: tl.x, xmax: br.x, ymin: br.y, ymax: tl.y };
  }

  // --- Lines ---------------------------------------------------------------

  segment(a: Vec, b: Vec, o: Stroke = {}): void {
    this.path([a, b], o);
  }

  /** The whole line through `a` and `b`. */
  line(a: Vec, b: Vec, o: Stroke = {}): void {
    const d = normalize(sub(b, a));
    const far = this.reach();
    this.path([sub(a, scale(d, far)), add(a, scale(d, far))], o);
  }

  /** The ray from `a` through `b`. */
  ray(a: Vec, b: Vec, o: Stroke = {}): void {
    this.path([a, add(a, scale(normalize(sub(b, a)), this.reach()))], o);
  }

  /** An open polyline. */
  path(pts: readonly Vec[], o: Stroke = {}): void {
    if (pts.length < 2) return;
    this.begin(o);
    this.trace(pts);
    this.stroke(o);
  }

  arrow(a: Vec, b: Vec, o: Stroke = {}): void {
    this.segment(a, b, o);
    const s = toScreen(this.view, b);
    const d = normalize(sub(toScreen(this.view, b), toScreen(this.view, a)));
    const n = { x: -d.y, y: d.x };
    const size = 10 + (o.width ?? 3);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.fillStyle = o.color ?? C.ink;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - d.x * size + n.x * size * 0.45, s.y - d.y * size + n.y * size * 0.45);
    ctx.lineTo(s.x - d.x * size - n.x * size * 0.45, s.y - d.y * size - n.y * size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // --- Shapes --------------------------------------------------------------

  polygon(pts: readonly Vec[], o: Fill = {}): void {
    if (pts.length < 2) return;
    this.begin(o);
    this.trace(pts);
    this.ctx.closePath();
    this.paint(o);
  }

  circle(center: Vec, r: number, o: Fill = {}): void {
    if (!(r > 0)) return;
    const c = toScreen(this.view, center);
    this.begin(o);
    this.ctx.arc(c.x, c.y, r * this.view.scale, 0, TAU);
    this.paint(o);
  }

  /** The arc of a circle from angle `from` counter-clockwise to `to`. */
  arc(center: Vec, r: number, from: number, to: number, o: Stroke = {}): void {
    if (!(r > 0)) return;
    this.begin(o);
    this.traceArc(center, r * this.view.scale, from, to);
    this.stroke(o);
  }

  /** The pie slice from angle `from` counter-clockwise to `to`. */
  sector(center: Vec, r: number, from: number, to: number, o: Fill = {}): void {
    if (!(r > 0)) return;
    const c = toScreen(this.view, center);
    this.begin(o);
    this.ctx.moveTo(c.x, c.y);
    this.traceArc(center, r * this.view.scale, from, to);
    this.ctx.closePath();
    this.paint(o);
  }

  // --- Marks ---------------------------------------------------------------

  /**
   * Mark the angle ∠AVB (the one under 180°) with an arc at `v`, or a square
   * corner when it is a right angle.
   */
  angle(a: Vec, v: Vec, b: Vec, o: AngleOptions = {}): void {
    const from = angleOf(sub(a, v));
    let sweep = angleOf(sub(b, v)) - from;
    while (sweep > Math.PI) sweep -= TAU;
    while (sweep < -Math.PI) sweep += TAU;
    if (!Number.isFinite(sweep)) return;
    const [start, end] = sweep >= 0 ? [from, from + sweep] : [from + sweep, from];
    this.angleMark(v, start, end, o);
  }

  /**
   * Mark the angle at `v` swept counter-clockwise from direction `from` to
   * direction `to` — use this for reflex angles or when the side matters.
   */
  angleMark(v: Vec, from: number, to: number, o: AngleOptions = {}): void {
    const { ctx } = this;
    const sweep = to - from;
    const degrees = toDeg(sweep);
    const r = o.r ?? 26;
    const color = o.color ?? C.ink;
    const c = toScreen(this.view, v);
    const isRight = o.square !== false && Math.abs(degrees - 90) < RIGHT_ANGLE_TOLERANCE;

    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.strokeStyle = color;
    ctx.lineWidth = o.width ?? 2.5;
    ctx.setLineDash(o.dash ?? []);
    ctx.lineJoin = "round";

    if (o.fill) {
      ctx.fillStyle = tint(color, 0.25);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      this.traceArc(v, r, from, to);
      ctx.closePath();
      ctx.fill();
    }
    if (isRight) {
      const s = r * 0.62;
      const u = { x: Math.cos(from), y: -Math.sin(from) };
      const w = { x: Math.cos(to), y: -Math.sin(to) };
      ctx.beginPath();
      ctx.moveTo(c.x + u.x * s, c.y + u.y * s);
      ctx.lineTo(c.x + (u.x + w.x) * s, c.y + (u.y + w.y) * s);
      ctx.lineTo(c.x + w.x * s, c.y + w.y * s);
      ctx.stroke();
    } else {
      for (let i = 0; i < (o.arcs ?? 1); i++) {
        ctx.beginPath();
        this.traceArc(v, r + i * 5, from, to);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (o.label) {
      const text = o.label === true ? `${Math.round(degrees)}°` : o.label;
      const reach = (r + 5 * ((o.arcs ?? 1) - 1) + 16) / this.view.scale;
      this.label(polar(v, reach, from + sweep / 2), text, { color, alpha: o.alpha, size: 14 });
    }
  }

  /** Tick marks across the middle of a segment: equal ticks, equal lengths. */
  ticks(a: Vec, b: Vec, count = 1, o: Stroke = {}): void {
    const sa = toScreen(this.view, a);
    const sb = toScreen(this.view, b);
    const d = normalize(sub(sb, sa));
    const n = { x: -d.y, y: d.x };
    const m = lerp(sa, sb, 0.5);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.strokeStyle = o.color ?? C.ink;
    ctx.lineWidth = o.width ?? 2;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * 5;
      ctx.moveTo(m.x + d.x * off - n.x * 7, m.y + d.y * off - n.y * 7);
      ctx.lineTo(m.x + d.x * off + n.x * 7, m.y + d.y * off + n.y * 7);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Chevrons along a segment pointing from `a` to `b`: the mark for parallels. */
  chevrons(a: Vec, b: Vec, count = 1, o: Stroke = {}): void {
    const sa = toScreen(this.view, a);
    const sb = toScreen(this.view, b);
    const d = normalize(sub(sb, sa));
    const n = { x: -d.y, y: d.x };
    const m = lerp(sa, sb, 0.5);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.strokeStyle = o.color ?? C.ink;
    ctx.lineWidth = o.width ?? 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const off = (i - (count - 1) / 2) * 7 + 3;
      ctx.moveTo(m.x + d.x * (off - 7) - n.x * 6, m.y + d.y * (off - 7) - n.y * 6);
      ctx.lineTo(m.x + d.x * off, m.y + d.y * off);
      ctx.lineTo(m.x + d.x * (off - 7) + n.x * 6, m.y + d.y * (off - 7) + n.y * 6);
    }
    ctx.stroke();
    ctx.restore();
  }

  /** A dot, optionally named. */
  point(p: Vec, o: { label?: string; color?: string; r?: number; alpha?: number } = {}): void {
    const s = toScreen(this.view, p);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.fillStyle = o.color ?? C.ink;
    ctx.beginPath();
    ctx.arc(s.x, s.y, o.r ?? 4.5, 0, TAU);
    ctx.fill();
    ctx.restore();
    if (o.label) this.label(p, o.label, { color: o.color, alpha: o.alpha, dx: 12, dy: 12 });
  }

  // --- Text ----------------------------------------------------------------

  /** Plain text anchored at a stage point. Use Unicode for symbols (², √, θ, ∠). */
  label(p: Vec, text: string, o: LabelOptions = {}): void {
    const s = toScreen(this.view, p);
    const x = s.x + (o.dx ?? 0);
    const y = s.y - (o.dy ?? 0);
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.font = `${o.bold ? 700 : 600} ${o.size ?? 15}px ${FONT}`;
    ctx.textAlign = o.align ?? "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 4;
    ctx.strokeStyle = HALO;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = o.color ?? C.ink;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /**
   * Text beside the middle of a segment, pushed off it by `offset` pixels.
   * Positive offsets go to the left of the direction a→b.
   */
  along(a: Vec, b: Vec, text: string, o: LabelOptions & { offset?: number } = {}): void {
    const n = normalize(perp(sub(b, a)));
    const off = o.offset ?? 16;
    this.label(lerp(a, b, 0.5), text, { size: 14, ...o, dx: n.x * off, dy: n.y * off });
  }

  // --- Coordinate plane ------------------------------------------------------

  /** Grid lines every `step` units across the visible stage. */
  grid(step = 1, o: Stroke = {}): void {
    const { xmin, xmax, ymin, ymax } = this.bounds;
    const style: Stroke = { color: C.faint, width: 1, ...o };
    for (let x = Math.ceil(xmin / step) * step; x <= xmax; x += step) {
      this.segment({ x, y: ymin }, { x, y: ymax }, style);
    }
    for (let y = Math.ceil(ymin / step) * step; y <= ymax; y += step) {
      this.segment({ x: xmin, y }, { x: xmax, y }, style);
    }
  }

  /** The x and y axes through `origin`, numbered every `every` units. */
  axes(o: { origin?: Vec; every?: number; color?: string; alpha?: number } = {}): void {
    const origin = o.origin ?? { x: 0, y: 0 };
    const { xmin, xmax, ymin, ymax } = this.bounds;
    const style: Stroke = { color: o.color ?? C.dim, width: 2, alpha: o.alpha };
    this.segment({ x: xmin, y: origin.y }, { x: xmax, y: origin.y }, style);
    this.segment({ x: origin.x, y: ymin }, { x: origin.x, y: ymax }, style);
    const every = o.every ?? 1;
    const text: LabelOptions = { color: o.color ?? C.dim, size: 12, alpha: o.alpha };
    for (let x = Math.ceil((xmin - origin.x) / every) * every; x + origin.x <= xmax; x += every) {
      if (x !== 0) this.label({ x: x + origin.x, y: origin.y }, tick(x), { ...text, dy: -13 });
    }
    for (let y = Math.ceil((ymin - origin.y) / every) * every; y + origin.y <= ymax; y += every) {
      if (y !== 0) this.label({ x: origin.x, y: y + origin.y }, tick(y), { ...text, dx: -13 });
    }
  }

  // --- Internals -------------------------------------------------------------

  /** Longer than any line that could cross the visible stage. */
  private reach(): number {
    return (this.view.width + this.view.height) / this.view.scale + 100;
  }

  private begin(o: Stroke): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.lineWidth = o.width ?? 3;
    ctx.setLineDash(o.dash ?? []);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
  }

  private trace(pts: readonly Vec[]): void {
    pts.forEach((p, i) => {
      const s = toScreen(this.view, p);
      if (i === 0) this.ctx.moveTo(s.x, s.y);
      else this.ctx.lineTo(s.x, s.y);
    });
  }

  /** Canvas angles run clockwise with y down, hence the sign flips. */
  private traceArc(center: Vec, radiusPx: number, from: number, to: number): void {
    const c = toScreen(this.view, center);
    this.ctx.arc(c.x, c.y, radiusPx, -from, -to, true);
  }

  private stroke(o: Stroke): void {
    this.ctx.strokeStyle = o.color ?? C.ink;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private paint(o: Fill): void {
    const { ctx } = this;
    if (o.fill) {
      ctx.fillStyle = o.fill;
      ctx.fill();
    }
    if (o.stroke !== null) {
      ctx.strokeStyle = o.stroke ?? o.color ?? C.ink;
      ctx.stroke();
    }
    ctx.restore();
  }
}
