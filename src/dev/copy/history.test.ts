// What a save keeps of the copy it replaces, in its lesson's history file.

import { describe, expect, it } from "vitest";
import { changesOf, historyFile, readHistory, recordSave } from "./history.ts";
import type { EntryEdit } from "./wire.ts";

const edits: EntryEdit[] = [
  { section: "steps", index: 1, was: { title: "Watch", text: "See it." }, to: { title: "Look", text: "See it." } },
  { section: "likes", index: 0, was: { title: "A ramp", text: "It rises." }, to: { text: "It climbs." } },
];

describe("changesOf", () => {
  it("lists each field a save changes, from what it read to what it reads now", () => {
    expect(changesOf(edits)).toEqual([
      { field: "steps.1.title", entry: "step 2", was: "Watch", now: "Look" },
      { field: "likes.0.text", entry: "likeness 1", was: "It rises.", now: "It climbs." },
    ]);
  });
});

describe("recordSave", () => {
  const AT = "2026-11-13T14:20:00.000Z";

  it("starts a lesson's history with its first save, and adds each one after", () => {
    const first = recordSave(null, "slope", edits, AT);
    expect(first.ok && readHistory(first.text!)).toEqual({ lesson: "slope", saves: [{ saved: AT, changes: changesOf(edits) }] });
    expect(first.ok && first.text!.endsWith("}\n")).toBe(true);

    const again: EntryEdit[] = [{ section: "steps", index: 1, was: { title: "Look", text: "See it." }, to: { title: "Watch closely" } }];
    const second = recordSave(first.ok ? first.text : null, "slope", again, "2026-11-14T09:00:00.000Z");
    const saves = second.ok ? readHistory(second.text!)!.saves : [];
    expect(saves.map((s) => s.changes.map((c) => [c.was, c.now]))).toEqual([
      [
        ["Watch", "Look"],
        ["It rises.", "It climbs."],
      ],
      [["Look", "Watch closely"]],
    ]);
  });

  it("writes nothing for a save that changes nothing", () => {
    const same: EntryEdit[] = [{ section: "steps", index: 0, was: { title: "A", text: "B" }, to: { title: "A" } }];
    expect(recordSave(null, "slope", same, AT)).toEqual({ ok: true, text: null });
  });

  it("refuses to write over a file it cannot read", () => {
    for (const bad of ["{", "[]", `{"lesson":"slope","saves":[{"saved":1}]}`]) {
      expect(recordSave(bad, "slope", edits, AT), bad).toEqual({
        ok: false,
        error: `${historyFile("slope")} is not a copy history; mend it by hand before saving.`,
      });
    }
  });
});
