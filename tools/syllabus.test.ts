// The syllabus's bookkeeping against the real course: every lesson's source
// found and its teaching text hashed, and the syllabus as committed sound and
// describing every lesson as it now stands.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lessons } from "../src/lessons.ts";
import { ABOUT, problems, stale } from "../src/recall/syllabus.ts";
import { hashes, hashOf, load, sourcesOf, SYLLABUS_PATH, teachingText } from "./syllabus.ts";

describe("the syllabus tool", () => {
  it("finds the module of a lab lesson, and of a standalone page as its HTML names it, with its directions", () => {
    expect(sourcesOf("linear-balance")).toEqual(["src/lab/lessons/linear-balance.ts"]);
    expect(sourcesOf("medians")).toEqual(["src/medians.ts", "src/directions.ts"]);
    expect(sourcesOf("angles")).toEqual(["src/main.ts", "src/directions.ts"]);
    expect(() => sourcesOf("nowhere")).toThrow("not a lesson");
  });

  it("takes a module's teaching text from the titles and texts it gives as strings, leaving its code", () => {
    const source = `
      const colour = "#fff";
      steps: [{ title: "Each side is a line", text: "Set $a$ and \\"b\\"." }],
      uses: [{ title: \`Trim\`, text: \`You have \${n} cm.\` }],
      label: "Not teaching", tex: "x^2",`;
    expect(teachingText(source)).toEqual(['"Each side is a line"', '"Set $a$ and \\"b\\"."', "`Trim`", "`You have ${n} cm.`"]);
  });

  it("hashes every lesson in the course, each from its own source", () => {
    const all = hashes();
    expect([...all.keys()]).toEqual(lessons.map((l) => l.slug));
    expect(new Set(all.values()).size).toBe(lessons.length);
    expect(hashOf("medians")).toMatch(/^[0-9a-f]{12}$/);
    expect(hashOf("medians")).toBe(all.get("medians"));
  });
});

describe("the syllabus as committed", () => {
  it("is in the form the tool writes, with nothing wrong in it", () => {
    const raw = JSON.parse(readFileSync(SYLLABUS_PATH, "utf8"));
    expect(raw.about).toBe(ABOUT);
    expect(problems(load(), lessons.map((l) => l.slug))).toEqual([]);
  });

  it("describes every lesson as its teaching text now stands", () => {
    // If this fails, run /syllabus in Claude Code: it describes the lessons
    // listed, from their source, without the Claude API.
    expect(stale(load(), hashes()), "Run /syllabus to describe these lessons").toEqual({ missing: [], changed: [] });
  });
});
