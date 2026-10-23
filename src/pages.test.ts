// The standalone lesson pages, checked as written. Each sizes its figure from
// its canvas's box, and a canvas only fills the window when its stylesheet
// says so: insets alone leave it at the 300x150 default, which jsdom cannot
// show because it does no layout. Each also carries the chrome page.ts builds,
// with written directions for its step column.

import { describe, expect, it } from "vitest";
import { directions } from "./directions.ts";
import { linkTex } from "./lab/link.ts";
import { richHtml } from "./lab/math.ts";
import { lessons } from "./lessons.ts";
import { moveBy } from "./pager.ts";

const pages = import.meta.glob<string>("../*.html", { query: "?raw", import: "default", eager: true });
const standalone = lessons.filter((l) => !l.lab);
const slugs = standalone.map((l) => l.slug);

function stageRule(slug: string): string {
  const html = pages[`../${slug}.html`] ?? "";
  return /#stage\s*\{([^}]*)\}/.exec(html)?.[1] ?? "";
}

describe("standalone pages", () => {
  it.each(slugs)("%s gives its stage canvas an explicit size", (slug) => {
    const rule = stageRule(slug);
    expect(rule).toMatch(/(^|[\s;])width:/);
    expect(rule).toMatch(/(^|[\s;])height:/);
  });

  it.each(slugs)("%s leaves the step column free and loads the page chrome", (slug) => {
    expect(stageRule(slug)).toContain("var(--steps-inset");
    expect(pages[`../${slug}.html`]).toContain('src="/src/page.ts"');
  });

  it.each(slugs)("%s has directions that typeset", (slug) => {
    const steps = directions[slug] ?? [];
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(step.title).not.toBe("");
      richHtml(step.text, true, linkTex);
    }
  });

  it("has directions only for standalone lessons", () => {
    expect(Object.keys(directions).sort()).toEqual([...slugs].sort());
  });
});

describe("moveBy", () => {
  const [first, second] = lessons;
  const neighbours = { prev: first, next: second };

  it("walks the steps", () => {
    expect(moveBy(0, 3, 1, neighbours)).toEqual({ kind: "step", step: 1 });
    expect(moveBy(2, 3, -1, neighbours)).toEqual({ kind: "step", step: 1 });
  });

  it("rolls over into the neighbouring lesson at either end", () => {
    expect(moveBy(2, 3, 1, neighbours)).toEqual({ kind: "lesson", lesson: second });
    expect(moveBy(0, 3, -1, neighbours)).toEqual({ kind: "lesson", lesson: first });
  });

  it("stays put at the ends of the course", () => {
    expect(moveBy(2, 3, 1, { prev: first, next: undefined })).toBeNull();
    expect(moveBy(0, 3, -1, { prev: undefined, next: second })).toBeNull();
  });
});
