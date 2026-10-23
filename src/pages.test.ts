// The standalone lesson pages, checked as written. Each sizes its figure from
// its canvas's box, and a canvas only fills the window when its stylesheet
// says so: insets alone leave it at the 300x150 default, which jsdom cannot
// show because it does no layout.

import { describe, expect, it } from "vitest";
import { lessons } from "./lessons.ts";

const pages = import.meta.glob<string>("../*.html", { query: "?raw", import: "default", eager: true });
const standalone = lessons.filter((l) => !l.lab);

function stageRule(slug: string): string {
  const html = pages[`../${slug}.html`] ?? "";
  return /#stage\s*\{([^}]*)\}/.exec(html)?.[1] ?? "";
}

describe("standalone pages", () => {
  it.each(standalone.map((l) => l.slug))("%s gives its stage canvas an explicit size", (slug) => {
    const rule = stageRule(slug);
    expect(rule).toMatch(/(^|[\s;])width:/);
    expect(rule).toMatch(/(^|[\s;])height:/);
  });
});
