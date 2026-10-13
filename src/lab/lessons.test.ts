// Every lab lesson, exercised without a browser: built against a real Scene,
// drawn at every step onto a canvas stand-in that rejects non-finite
// coordinates, with every handle dragged around the stage and every control
// pressed. All text is typeset strictly, so a LaTeX typo fails here instead of
// showing up as red source text on screen.

import { describe, expect, it } from "vitest";
import { lessons } from "../lessons.ts";
import { Draw, type View } from "./draw.ts";
import { richHtml, texHtml } from "./math.ts";
import { Scene, type Frame, type HandPoints, type LessonBuilder, type LessonView } from "./scene.ts";
import { STAGE } from "./shell.ts";

const modules = import.meta.glob<{ default: LessonBuilder }>("./lessons/*.ts", { eager: true });
const moduleSlugs = Object.keys(modules).map((path) => path.replace(/^.*\/(.+)\.ts$/, "$1"));
const labLessons = lessons.filter((l) => l.lab);

const VIEW: View = { scale: 50, ox: 500, oy: 350, width: 1000, height: 700 };

/** A 2D context that accepts every call but insists the numbers are real. */
function canvasStandIn(): CanvasRenderingContext2D {
  const check = (name: string, args: unknown[]): void => {
    for (const a of args.flat()) {
      if (typeof a === "number" && !Number.isFinite(a)) {
        throw new Error(`ctx.${name} received a non-finite number`);
      }
    }
  };
  return new Proxy({} as Record<string, unknown>, {
    get: (store, name: string) =>
      name in store ? store[name] : (...args: unknown[]) => check(name, args),
    set: (store, name: string, value) => {
      store[name] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

function frameAt(step: number, hands: HandPoints[] = []): Frame {
  return { step, at: (n) => (n <= step ? 1 : 0), time: 1.5, hands };
}

/** Draw one frame and typeset its readouts, as the shell would. */
function show(view: LessonView, frame: Frame): void {
  view.draw(new Draw(canvasStandIn(), VIEW, "#38d9a9"), frame);
  for (const row of view.readout?.(frame) ?? []) {
    if (row.label) richHtml(row.label, true);
    texHtml(row.tex, true);
  }
}

function showAllSteps(view: LessonView): void {
  for (let step = 0; step < view.steps.length; step++) show(view, frameAt(step));
}

// A hand whose landmarks are spread over the stage, for lessons that read one.
const HAND: HandPoints = {
  side: "right",
  points: Array.from({ length: 21 }, (_, i) => ({ x: -3 + (i % 5) * 1.3, y: -2 + Math.floor(i / 5) })),
};

const PROBES = [
  { x: 0, y: 0 },
  { x: -STAGE.halfWidth, y: -STAGE.halfHeight },
  { x: STAGE.halfWidth, y: STAGE.halfHeight },
  { x: -STAGE.halfWidth, y: STAGE.halfHeight },
  { x: STAGE.halfWidth, y: -STAGE.halfHeight },
  { x: 2.5, y: -1.5 },
];

describe("reading order", () => {
  it("has unique slugs", () => {
    const slugs = lessons.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has a module for every lab lesson, and an entry for every module", () => {
    expect([...moduleSlugs].sort()).toEqual(labLessons.map((l) => l.slug).sort());
  });

  it("has a page for every standalone lesson", () => {
    const pages = Object.keys(import.meta.glob("/*.html")).map((p) => p.replace(/^\/(.+)\.html$/, "$1"));
    for (const l of lessons.filter((x) => !x.lab)) expect(pages).toContain(l.slug);
  });
});

describe.each(labLessons.map((l) => [l.slug, l] as const))("lesson %s", (slug, meta) => {
  const build = modules[`./lessons/${slug}.ts`]?.default;
  const fresh = (): { scene: Scene; view: LessonView } => {
    const scene = new Scene(meta.accent);
    return { scene, view: build(scene) };
  };

  it("has well-formed steps", () => {
    const { view } = fresh();
    expect(view.steps.length).toBeGreaterThan(0);
    for (const step of view.steps) {
      expect(step.title.trim()).not.toBe("");
      expect(step.title).not.toContain("$");
      expect(step.text.trim()).not.toBe("");
      richHtml(step.text, true);
    }
  });

  it("starts inside the stage", () => {
    const { scene } = fresh();
    for (const h of scene.handles) {
      expect(Math.abs(h.x)).toBeLessThanOrEqual(STAGE.halfWidth);
      expect(Math.abs(h.y)).toBeLessThanOrEqual(STAGE.halfHeight);
    }
  });

  it("draws every step, with and without a hand in view", () => {
    const { view } = fresh();
    showAllSteps(view);
    show(view, frameAt(view.steps.length - 1, [HAND]));
  });

  it("survives every handle being dragged anywhere", () => {
    const { scene, view } = fresh();
    for (const handle of scene.handles) {
      const home = { x: handle.x, y: handle.y };
      for (const probe of PROBES) {
        handle.set(probe);
        expect(Number.isFinite(handle.x) && Number.isFinite(handle.y)).toBe(true);
        showAllSteps(view);
      }
      handle.set(home);
    }
    // And all of them shoved into the same corner at once.
    for (const handle of scene.handles) handle.set(PROBES[1]);
    showAllSteps(view);
  });

  it("survives every control being used", () => {
    const { scene, view } = fresh();
    for (const control of scene.controls) {
      if (control.kind === "toggle") {
        control.on = !control.on;
        showAllSteps(view);
        control.on = !control.on;
      } else if (control.kind === "choice") {
        for (const option of control.options) {
          control.value = option;
          showAllSteps(view);
        }
      } else {
        control.run();
        showAllSteps(view);
      }
    }
    scene.emptyDrag?.(40, -25);
    showAllSteps(view);
  });
});
