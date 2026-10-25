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
const viteConfig = Object.values(
  import.meta.glob<string>("../vite.config.ts", { query: "?raw", import: "default", eager: true }),
)[0];
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

  it.each(slugs)("%s fills the box the page chrome leaves it and loads the page chrome", (slug) => {
    for (const side of ["left", "top", "width", "height"]) expect(stageRule(slug)).toContain(`var(--stage-${side}`);
    expect(pages[`../${slug}.html`]).toContain('src="/src/page.ts"');
  });

  it.each(slugs)("%s runs its lesson before the page chrome", (slug) => {
    // chrome.ts: page.ts reads whether the lesson asked for a formula band.
    const scripts = [...(pages[`../${slug}.html`] ?? "").matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    expect(scripts.at(-1)).toBe("/src/page.ts");
    expect(scripts.length).toBeGreaterThan(1);
  });

  it.each(slugs)("%s has directions that typeset", (slug) => {
    const steps = directions[slug] ?? [];
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(step.title).not.toBe("");
      richHtml(step.text, true, linkTex);
    }
  });

  it("brings in the Pythagoras proof at the step that scrubs it", () => {
    // pythagoras.ts PROOF_STEP.
    expect(directions.pythagoras[2].title).toBe("Scrub the proof");
  });

  it("gives congruence an intro and then one step per test, which a phone shows alone", () => {
    // congruence.ts shown(): step n > 0 shows cell n − 1.
    const steps = directions.congruence;
    expect(steps).toHaveLength(5);
    expect(steps.slice(1, 4).map((s) => s.title.split(":")[0])).toEqual(["SSS", "SAS", "ASA"]);
    expect(steps[4].title).toContain("SSA");
  });

  it("has directions only for standalone lessons", () => {
    expect(Object.keys(directions).sort()).toEqual([...slugs].sort());
  });
});

describe("every page", () => {
  // A page left out of the build works under `vite dev` and is missing from
  // the deployed site, where its links then lead nowhere.
  it.each(Object.keys(pages).map((path) => path.slice(3)))("%s is built", (file) => {
    expect(viteConfig).toContain(`resolve(__dirname, "${file}")`);
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
