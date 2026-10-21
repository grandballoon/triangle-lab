// Links a formula's terms to the figure. Typeset formulas mark their terms
// with `data-term` (scene.ts `term`); this module follows the pointer — a
// mouse, or a hand, which arrives as synthetic pointer events — to find the
// term under it, and draws thin leader lines from that term to the marks the
// figure drew for it (draw.ts anchors).
//
// The term is looked up afresh each frame from the last pointer position,
// because formulas are re-typeset as their values change and the element
// that was hovered may since have been replaced.

import type { Vec } from "./geo.ts";

const SVG = "http://www.w3.org/2000/svg";
const FOCUS_CLASS = "term-focus";

export interface FocusedTerm {
  id: string;
  /** The term's box on screen. */
  box: DOMRect;
}

export class TermFocus {
  private pointer: Vec | null = null;
  /** The element under the pointer at its last move, for when layout is unavailable. */
  private target: Element | null = null;
  private lit: Element | null = null;
  private readonly lines: SVGLineElement[] = [];
  private readonly dots: SVGCircleElement[] = [];

  constructor(
    private readonly doc: Document,
    private readonly svg: SVGSVGElement,
  ) {
    doc.addEventListener("pointermove", (e) => {
      this.pointer = { x: e.clientX, y: e.clientY };
      this.target = e.target instanceof Element ? e.target : null;
    });
    // The mouse left the window.
    doc.documentElement.addEventListener("pointerleave", () => {
      this.pointer = null;
      this.target = null;
    });
  }

  /** The term under the pointer now, if any. */
  current(): FocusedTerm | null {
    const p = this.pointer;
    const under = p && typeof this.doc.elementFromPoint === "function"
      ? this.doc.elementFromPoint(p.x, p.y)
      : this.target;
    const el = under?.closest<HTMLElement>("[data-term]") ?? null;
    if (el !== this.lit) {
      this.lit?.classList.remove(FOCUS_CLASS);
      el?.classList.add(FOCUS_CLASS);
      this.lit = el;
    }
    return el?.dataset.term ? { id: el.dataset.term, box: el.getBoundingClientRect() } : null;
  }

  /** Draw a leader from `box` to each point in `to`, all in client pixels; none hides them. */
  lead(box: DOMRect | null, to: readonly Vec[]): void {
    const count = box ? to.length : 0;
    while (this.lines.length < count) {
      const line = this.doc.createElementNS(SVG, "line");
      const dot = this.doc.createElementNS(SVG, "circle");
      dot.setAttribute("r", "3");
      this.svg.append(line, dot);
      this.lines.push(line);
      this.dots.push(dot);
    }
    this.lines.forEach((line, i) => {
      const dot = this.dots[i];
      const shown = i < count;
      line.style.display = dot.style.display = shown ? "" : "none";
      if (!shown || !box) return;
      const end = to[i];
      const start = nearestOnBox(box, end);
      line.setAttribute("x1", String(start.x));
      line.setAttribute("y1", String(start.y));
      line.setAttribute("x2", String(end.x));
      line.setAttribute("y2", String(end.y));
      dot.setAttribute("cx", String(end.x));
      dot.setAttribute("cy", String(end.y));
    });
  }
}

/** The point of `box` closest to `p`. */
export function nearestOnBox(box: DOMRect, p: Vec): Vec {
  return {
    x: Math.min(box.right, Math.max(box.left, p.x)),
    y: Math.min(box.bottom, Math.max(box.top, p.y)),
  };
}
