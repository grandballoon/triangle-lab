// Complex numbers for the Complex Numbers lessons: arithmetic on a + bi as
// stage points (x is the real part, y the imaginary part), the plane they
// are drawn on, and how to write one in TeX or on the canvas.

import { C, type Draw } from "../draw.ts";
import { fmt, type Vec } from "../geo.ts";

/** a + bi, as a point: `x` is the real part a, `y` the imaginary part b. */
export type Cx = Vec;

export const cx = (re: number, im: number): Cx => ({ x: re, y: im });
export const plus = (z: Cx, w: Cx): Cx => cx(z.x + w.x, z.y + w.y);
export const minus = (z: Cx, w: Cx): Cx => cx(z.x - w.x, z.y - w.y);
/** (a + bi)(c + di) = (ac − bd) + (ad + bc)i. */
export const times = (z: Cx, w: Cx): Cx => cx(z.x * w.x - z.y * w.y, z.x * w.y + z.y * w.x);
export const conj = (z: Cx): Cx => cx(z.x, -z.y);
/** a² + b², which is z times its conjugate. */
export const norm = (z: Cx): number => z.x * z.x + z.y * z.y;
export const size = (z: Cx): number => Math.sqrt(norm(z));
/** z ÷ w, or null when w is 0. */
export function over(z: Cx, w: Cx): Cx | null {
  const n = norm(w);
  if (n < 1e-12) return null;
  const top = times(z, conj(w));
  return cx(top.x / n, top.y / n);
}

/** The square roots of w, the one with positive real part (or positive imaginary part, on the negative axis) first. */
export function roots(w: Cx): [Cx, Cx] {
  const r = size(w);
  const x = Math.sqrt(Math.max(0, (r + w.x) / 2));
  const y = Math.sqrt(Math.max(0, (r - w.x) / 2)) * (w.y < 0 ? -1 : 1);
  return [cx(x, y), cx(-x, -y)];
}

/** A number for TeX, whole when it is close to whole. */
function num(v: number, digits: number): string {
  return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : fmt(v, digits);
}

/** z as TeX: 3 + 2i, 3 - 2i, -i, 4, 0. `unit` is the imaginary unit's name. */
export function texCx(z: Cx, digits = 2, unit = "i"): string {
  const re = num(z.x, digits);
  const imAbs = num(Math.abs(z.y), digits);
  const imZero = imAbs === "0";
  const reZero = re === "0" || re === "-0";
  const imPart = imAbs === "1" ? unit : `${imAbs}${unit}`;
  if (imZero) return reZero ? "0" : re;
  if (reZero) return z.y < 0 ? `-${imPart}` : imPart;
  return `${re} ${z.y < 0 ? "-" : "+"} ${imPart}`;
}

/** A real number for TeX, bracketed when negative so it can follow a sign. */
export const texTerm = (v: number, digits = 2): string => (v < 0 ? `(${num(v, digits)})` : num(v, digits));

/** z as canvas text, with a true minus sign. */
export const textCx = (z: Cx, digits = 2): string => texCx(z, digits).replace(/-/g, "−");

/** z as TeX in brackets when it has two parts, so it can be multiplied. */
export const texFactor = (z: Cx, digits = 2): string => {
  const t = texCx(z, digits);
  return /[+]| - /.test(t) ? `(${t})` : t;
};

/** The complex plane: grid, the real and imaginary axes, and their names. */
export function plane(g: Draw, o: { every?: number } = {}): void {
  g.grid(1);
  g.axes({ every: o.every ?? 2 });
  const { xmax, ymax } = g.bounds;
  g.label({ x: xmax, y: 0 }, "real", { color: C.dim, size: 13, dx: -8, dy: 14, align: "right" });
  g.label({ x: 0, y: ymax }, "imaginary", { color: C.dim, size: 13, dx: 10, dy: -14, align: "left" });
}

/** An arrow from the origin (or `from`) to z, with z's value written at its tip. */
export function vector(g: Draw, z: Cx, o: { color: string; from?: Cx; label?: string; alpha?: number; dash?: number[] }): void {
  const from = o.from ?? cx(0, 0);
  const tip = plus(from, z);
  if (size(z) > 1e-9) g.arrow(from, tip, { color: o.color, width: 3, alpha: o.alpha, dash: o.dash });
  if (o.label !== undefined) {
    // Keep the label on the stage even when the arrow runs off it, and write
    // it towards the middle when the tip is near a side.
    const at = { x: Math.max(-6.5, Math.min(6.5, tip.x)), y: Math.max(-4.5, Math.min(4.5, tip.y)) };
    const right = at.x < -2 || (at.x <= 2 && tip.x >= from.x);
    g.label(at, o.label, { color: o.color, size: 15, bold: true, dx: right ? 10 : -10, dy: tip.y >= from.y ? 12 : -18, align: right ? "left" : "right", alpha: o.alpha });
  }
}
