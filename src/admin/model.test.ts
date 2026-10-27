// What the admin page shows: the answer key as rows, how each stands, the
// labels it reads by, and what the Worker's replies mean.

import { describe, expect, it } from "vitest";
import { course, courseLesson } from "../course/course.ts";
import { factBasis, type Item, type MaterialView } from "../recall/material.ts";
import {
  factRows,
  originLabel,
  readItemReply,
  readViewReply,
  referenceRows,
  staleLabel,
  tally,
  tallyLabel,
  wanting,
} from "./model.ts";

const medians = courseLesson("medians")!;
const written = (text: string, basis: string): Item => ({ basis, versions: [{ text, at: 1, origin: "written" }] });
const card = (id: string, lesson: string, step: number, question = `${id}?`) => ({ id, question, lesson, step, stepTitle: "" });

describe("factRows", () => {
  it("has a row for every step of every lesson, in reading order, standing as written", () => {
    const view: MaterialView = {
      items: {
        "fact:medians/0": written("Current.", factBasis(medians.steps[0])),
        "fact:medians/1": written("Stale.", "an older text"),
      },
      cards: [],
    };
    const lessons = factRows(view);
    expect(lessons.map((l) => l.lesson.slug)).toEqual(course.map((l) => l.slug));
    const rows = lessons.find((l) => l.lesson.slug === "medians")!.rows;
    expect(rows).toHaveLength(medians.steps.length);
    expect(rows.slice(0, 3).map((r) => r.standing)).toEqual(["current", "stale", "missing"]);
    expect(rows[1]).toMatchObject({ key: "fact:medians/1", step: 1, taught: medians.steps[1], target: { kind: "fact", lesson: "medians", step: 1 } });
  });
});

describe("referenceRows", () => {
  it("groups questions by lesson in reading order, by step within one, with their step's key fact", () => {
    const view: MaterialView = {
      items: {
        "reference:b": written("At $G$.", "b?"),
        "reference:c": written("Old.", "c, as first asked?"),
        "fact:medians/2": written("The centroid divides each median $2:1$.", "x"),
      },
      cards: [card("gone", "nowhere", 0), card("a", "medians", 2), card("b", "medians", 0), card("c", "angles", 1)],
    };
    const groups = referenceRows(view);
    expect(groups.map((g) => g.lesson)).toEqual(["angles", "medians", "nowhere"]);
    const inMedians = groups.find((g) => g.lesson === "medians")!.rows;
    expect(inMedians.map((r) => r.card.id)).toEqual(["b", "a"]);
    expect(inMedians.map((r) => r.standing)).toEqual(["current", "missing"]);
    expect(inMedians[1].fact).toBe("The centroid divides each median $2:1$.");
    expect(inMedians[0].fact).toBeNull();
    expect(groups.find((g) => g.lesson === "angles")!.rows[0].standing).toBe("stale");
  });
});

describe("tallies and labels", () => {
  const rows = factRows({
    items: { "fact:medians/0": written("x", factBasis(medians.steps[0])), "fact:medians/1": written("y", "old") },
    cards: [],
  }).find((l) => l.lesson.slug === "medians")!.rows;

  it("counts how the rows stand, and says which want writing", () => {
    expect(tally(rows)).toEqual({ current: 1, stale: 1, missing: medians.steps.length - 2 });
    expect(rows.map(wanting).slice(0, 3)).toEqual([false, true, true]);
    expect(tallyLabel(rows)).toBe(`2 of ${medians.steps.length} written · 1 stale`);
    expect(tallyLabel(rows.slice(0, 1))).toBe("1 of 1 written");
  });

  it("says why a piece is stale, in its own terms", () => {
    expect(staleLabel(rows[1])).toBe("Written before this step's text changed.");
    const [reference] = referenceRows({ items: {}, cards: [card("a", "medians", 0)] })[0].rows;
    expect(staleLabel(reference)).toBe("Written for an earlier wording of the question.");
  });

  it("says how each version came to be", () => {
    const when = (at: number) => `at ${at}`;
    expect(originLabel({ text: "", at: 1, origin: "written" }, when)).toBe("Written by Claude");
    expect(originLabel({ text: "", at: 1, origin: "refined", instruction: "Name the point." }, when)).toBe("Refined: “Name the point.”");
    expect(originLabel({ text: "", at: 1, origin: "edited" }, when)).toBe("Edited by you");
    expect(originLabel({ text: "", at: 9, origin: "restored", from: 4 }, when)).toBe("Restored from at 4");
  });
});

describe("the Worker's replies", () => {
  it("reads the material, a key turned down, a failure and no reply at all", () => {
    expect(readViewReply({ status: 200, body: { items: {}, cards: [] } })).toEqual({ kind: "ok", value: { items: {}, cards: [] } });
    expect(readViewReply({ status: 401, body: { error: "That key is not the admin key." } })).toEqual({ kind: "refused" });
    expect(readViewReply({ status: 503, body: { error: "The Worker's ADMIN_KEY is missing." } })).toEqual({
      kind: "failed",
      error: "The Worker's ADMIN_KEY is missing.",
    });
    expect(readViewReply({ status: 500, body: null })).toEqual({ kind: "failed", error: "The server answered 500." });
    expect(readViewReply(null)).toEqual({ kind: "failed", error: "Can't reach the server." });
    expect(readViewReply({ status: 200, body: "nonsense" })).toEqual({ kind: "failed", error: "The material came back unreadable." });
  });

  it("reads the piece a change answers with", () => {
    const item = written("At $G$.", "b?");
    expect(readItemReply({ status: 200, body: item })).toEqual({ kind: "ok", value: item });
    expect(readItemReply({ status: 502, body: { error: "Claude declined to write this." } })).toEqual({
      kind: "failed",
      error: "Claude declined to write this.",
    });
  });
});
