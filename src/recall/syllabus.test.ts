// What each lesson teaches and builds on: reading the file, what is wrong
// with it, what is stale, and which lessons are within reach of those known.

import { describe, expect, it } from "vitest";
import { lessons } from "../lessons.ts";
import { ABOUT, problems, readSyllabus, saveSyllabus, stale, withinReach, type Syllabus } from "./syllabus.ts";

const entry = (builds_on: string[] = [], source = "abc") => ({ source, teaches: ["Something."], builds_on });

describe("readSyllabus", () => {
  it("keeps entries that make sense, trimmed", () => {
    const raw = {
      lessons: {
        medians: { source: "h", teaches: [" A median halves the opposite side. ", "", 3], builds_on: ["perimeter", 4] },
        bisectors: { source: "h", teaches: [], builds_on: [] },
        altitudes: { teaches: ["x"], builds_on: [] },
        incircle: "nothing",
      },
    };
    expect(readSyllabus(raw)).toEqual({ medians: { source: "h", teaches: ["A median halves the opposite side."], builds_on: ["perimeter"] } });
  });

  it("reads nothing from anything else", () => {
    for (const raw of [null, "x", {}, { lessons: [] }]) expect(readSyllabus(raw)).toEqual({});
  });
});

describe("saveSyllabus", () => {
  it("puts entries in reading order under a note on how the file is written", () => {
    const saved = saveSyllabus({ pythagoras: entry(), angles: entry(), medians: entry() });
    expect(saved.about).toBe(ABOUT);
    expect(Object.keys(saved.lessons)).toEqual(["angles", "medians", "pythagoras"]);
    expect(Object.keys(saved.lessons.angles)).toEqual(["source", "teaches", "builds_on"]);
  });
});

describe("problems", () => {
  const slugs = ["angles", "medians", "centroid", "pythagoras"];

  it("finds nothing wrong with a sound syllabus", () => {
    expect(problems({ angles: entry(), medians: entry(["angles"]), pythagoras: entry(["angles", "medians"]) }, slugs)).toEqual([]);
  });

  it("says which lessons are unknown, build on unknown lessons or themselves, or teach nothing", () => {
    const syllabus: Syllabus = { nowhere: entry(), medians: entry(["medians", "gone"]), angles: { ...entry(), teaches: [] } };
    expect(problems(syllabus, slugs)).toEqual([
      "nowhere is not a lesson in the course.",
      "medians builds on itself.",
      "medians builds on gone, which is not a lesson in the course.",
      "angles teaches nothing.",
    ]);
  });

  it("finds lessons that build on each other in a circle", () => {
    const syllabus = { angles: entry(["pythagoras"]), medians: entry(["angles"]), pythagoras: entry(["medians"]) };
    expect(problems(syllabus, slugs)).toEqual(["These lessons build on each other in a circle: angles → pythagoras → medians → angles."]);
  });
});

describe("stale", () => {
  it("lists lessons with no entry, and those whose source has changed, in the order given", () => {
    const syllabus = { angles: entry([], "a1"), medians: entry([], "old") };
    const now = new Map([["pythagoras", "p1"], ["angles", "a1"], ["medians", "m2"], ["bisectors", "b1"]]);
    expect(stale(syllabus, now)).toEqual({ missing: ["pythagoras", "bisectors"], changed: ["medians"] });
  });
});

describe("withinReach", () => {
  it("lists lessons not yet known whose every groundwork is, in reading order", () => {
    const syllabus = {
      angles: entry(),
      equilateral: entry(["angles"]),
      medians: entry(["angles", "perimeter"]),
      perimeter: entry(["angles"]),
      pythagoras: entry(["perimeter"]),
    };
    const order = lessons.map((l) => l.slug);
    const reach = withinReach(syllabus, new Set(["angles"]));
    expect(reach).toEqual(["equilateral", "perimeter"].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
    expect(withinReach(syllabus, new Set(["angles", "perimeter"]))).toEqual(
      ["equilateral", "medians", "pythagoras"].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    );
  });

  it("does not count a lesson that builds on nothing, or one not yet described, as reached", () => {
    expect(withinReach({ angles: entry() }, new Set())).toEqual([]);
    expect(withinReach({}, new Set(["angles"]))).toEqual([]);
  });
});
