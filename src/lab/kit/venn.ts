// Venn diagrams for the Sets lessons: the regions cut out by two or three
// overlapping circles in a universe box, as polygons that can be filled one by
// one, and a good spot inside each for its label or count.
//
// A region is named by which circles it lies inside: for circles A and B,
// [true, false] is "in A, not in B". Its boundary is made of the arcs between
// crossing points whose other memberships match the name, chained into one
// loop. The region outside every circle is the box with the union cut out,
// joined by a slit so that one polygon fills it.

import { circleCircle, dist, polar, signedArea, type Vec } from "../geo.ts";

export interface Disc {
  c: Vec;
  r: number;
}

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const inside = (p: Vec, d: Disc): boolean => dist(p, d.c) < d.r;

/** Which discs `p` lies inside. */
export const membership = (p: Vec, discs: readonly Disc[]): boolean[] => discs.map((d) => inside(p, d));

/** Every arc of every circle between crossing points, as sampled points, with the disc it belongs to. */
function arcs(discs: readonly Disc[]): { disc: number; pts: Vec[] }[] {
  const out: { disc: number; pts: Vec[] }[] = [];
  discs.forEach((d, i) => {
    const cuts: number[] = [];
    discs.forEach((e, j) => {
      if (j !== i) for (const p of circleCircle(d.c, d.r, e.c, e.r)) cuts.push(Math.atan2(p.y - d.c.y, p.x - d.c.x));
    });
    cuts.sort((a, b) => a - b);
    if (cuts.length === 0) cuts.push(0);
    cuts.forEach((from, k) => {
      const to = k + 1 < cuts.length ? cuts[k + 1] : cuts[0] + 2 * Math.PI;
      const n = Math.max(2, Math.ceil(((to - from) / (2 * Math.PI)) * 120));
      const pts: Vec[] = [];
      for (let s = 0; s <= n; s++) pts.push(polar(d.c, d.r, from + ((to - from) * s) / n));
      out.push({ disc: i, pts });
    });
  });
  return out;
}

/** Chain arcs end to end into one loop. */
function chain(pieces: Vec[][]): Vec[] {
  if (pieces.length === 0) return [];
  const left = pieces.slice(1);
  const loop = [...pieces[0]];
  while (left.length > 0) {
    const end = loop[loop.length - 1];
    let best = 0;
    let flip = false;
    let gap = Infinity;
    left.forEach((p, k) => {
      const a = dist(end, p[0]);
      const b = dist(end, p[p.length - 1]);
      if (a < gap) [gap, best, flip] = [a, k, false];
      if (b < gap) [gap, best, flip] = [b, k, true];
    });
    const [next] = left.splice(best, 1);
    loop.push(...(flip ? [...next].reverse() : next).slice(1));
  }
  return loop;
}

/**
 * The boundary of the region inside exactly the discs marked true, as a
 * polygon. With every mark false it is the part of `box` outside all the
 * discs. Empty when no such region is drawn.
 */
export function region(discs: readonly Disc[], marks: readonly boolean[], box: Box): Vec[] {
  const pieces = arcs(discs)
    .filter(({ disc, pts }) => {
      const mid = pts[Math.floor(pts.length / 2)];
      return discs.every((d, j) => j === disc || inside(mid, d) === marks[j]);
    })
    .map((a) => a.pts);
  const loop = chain(pieces);
  if (marks.some(Boolean) || loop.length === 0) return loop;

  // Outside everything: the box one way round, the union the other way, joined by a slit.
  const corners: Vec[] = [
    { x: box.x0, y: box.y0 },
    { x: box.x1, y: box.y0 },
    { x: box.x1, y: box.y1 },
    { x: box.x0, y: box.y1 },
  ];
  const hole = signedArea(loop) > 0 ? [...loop].reverse() : loop;
  return [...corners, corners[0], ...hole, hole[0], corners[0]];
}

const spots = new Map<string, Vec>();

/** A point well inside the region: the sampled point farthest from its edges. */
export function spot(discs: readonly Disc[], marks: readonly boolean[], box: Box): Vec {
  const key = JSON.stringify([discs, marks, box]);
  const known = spots.get(key);
  if (known) return known;
  let best: Vec = { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 };
  let room = -1;
  const step = 0.08;
  for (let x = box.x0 + step; x < box.x1; x += step) {
    for (let y = box.y0 + step; y < box.y1; y += step) {
      const p = { x, y };
      if (!membership(p, discs).every((m, i) => m === marks[i])) continue;
      const edge = Math.min(
        ...discs.map((d) => Math.abs(dist(p, d.c) - d.r)),
        x - box.x0,
        box.x1 - x,
        y - box.y0,
        box.y1 - y,
      );
      if (edge > room) [room, best] = [edge, p];
    }
  }
  spots.set(key, best);
  return best;
}

/** Every membership pattern for n circles, outside-all first. */
export function patterns(n: number): boolean[][] {
  const out: boolean[][] = [];
  for (let k = 0; k < 1 << n; k++) out.push(Array.from({ length: n }, (_, i) => ((k >> i) & 1) === 1));
  return out;
}

/** Two circles in a universe box, on the left of the stage, the right kept for text. */
export const VENN2: { box: Box; discs: Disc[] } = {
  box: { x0: -7.6, y0: -2.7, x1: 0.9, y1: 3.7 },
  discs: [
    { c: { x: -4.5, y: 0.4 }, r: 2.5 },
    { c: { x: -2.2, y: 0.4 }, r: 2.5 },
  ],
};

/** Three circles in a universe box, on the left of the stage. */
export const VENN3: { box: Box; discs: Disc[] } = {
  box: { x0: -7.6, y0: -2.75, x1: 0.6, y1: 3.75 },
  discs: [
    { c: { x: -4.6, y: 1.1 }, r: 2.0 },
    { c: { x: -2.4, y: 1.1 }, r: 2.0 },
    { c: { x: -3.5, y: -0.75 }, r: 2.0 },
  ],
};
