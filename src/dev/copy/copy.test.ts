// The copy editor's page side: reading a save and a fact-check off the wire,
// what it makes of a field as typed, and the editor's state.

import { describe, expect, it } from "vitest";
import { linkTex } from "../../lab/link.ts";
import { richHtml } from "../../lab/math.ts";
import { fieldId, readCheckRequest, readCopyCheck, readFieldId, MAX_FIELD, type CopyCheck } from "./check.ts";
import { draft } from "./draft.ts";
import {
  applyFix,
  askCheck,
  changed,
  checkedAsItStands,
  checkOf,
  discardAll,
  editField,
  fieldsOf,
  openCopy,
  problems,
  remarksOf,
  reopen,
  saveOf,
  settleCheck,
  valueOf,
  type CopyState,
} from "./edit.ts";
import { parseCopyEdit, type CopyEdit, type CopyListing } from "./wire.ts";

const PAGE = "/lab.html?lesson=slope";

const listing = (over: Partial<CopyListing> = {}): CopyListing => ({
  steps: {
    file: "src/lab/lessons/slope.ts",
    entries: [
      { title: "Rise", text: "Slope is rise over run, $m = \\frac{\\Delta y}{\\Delta x}$." },
      { title: null, text: "Drag $A$." },
    ],
  },
  likes: { file: "src/lab/lessons/slope.ts", entries: [{ title: "A ramp", text: "A ramp of 1 in 12 rises 1 for every 12 along." }] },
  uses: { file: "src/lab/lessons/slope.ts", entries: [] },
  ...over,
});

const open = (kept: unknown = null): CopyState => openCopy(listing(), kept).state;

describe("parseCopyEdit", () => {
  const edit: CopyEdit = {
    page: PAGE,
    edits: [{ section: "likes", index: 0, was: { title: "A ramp", text: "x" }, to: { title: "A wheelchair ramp" } }],
  };

  it("accepts a complete set of edits, with their new text trimmed", () => {
    expect(parseCopyEdit(edit)).toEqual(edit);
    const untrimmed = { ...edit, edits: [{ ...edit.edits[0], to: { title: "  A wheelchair ramp \n" } }] };
    expect(parseCopyEdit(untrimmed)).toEqual(edit);
  });

  it("refuses anything else", () => {
    const one = edit.edits[0];
    for (const bad of [
      null,
      "edit",
      { ...edit, edits: [] },
      { ...edit, page: 3 },
      ...[
        { ...one, section: "asides" },
        { ...one, index: -1 },
        { ...one, index: 1.5 },
        { ...one, to: {} },
        { ...one, to: { title: "  " } },
        { ...one, to: { body: "x" } },
        { ...one, was: { title: 3, text: null } },
        { ...one, was: null },
      ].map((e) => ({ ...edit, edits: [e] })),
    ]) {
      expect(parseCopyEdit(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("field ids", () => {
  it("name a section, entry and field, and nothing else", () => {
    expect(readFieldId(fieldId("uses", 3, "text"))).toEqual({ section: "uses", index: 3, field: "text" });
    for (const bad of ["steps.0", "steps.0.text.x", "asides.0.text", "steps.-1.text", "steps.01.text", "steps.0.body"]) {
      expect(readFieldId(bad), bad).toBeNull();
    }
  });
});

describe("readCheckRequest", () => {
  it("accepts the copy as sent, cutting a field down to size", () => {
    const long = "x".repeat(MAX_FIELD + 10);
    expect(readCheckRequest({ page: PAGE, fields: [{ id: "steps.0.text", text: long }] })).toEqual({
      page: PAGE,
      fields: [{ id: "steps.0.text", text: long.slice(0, MAX_FIELD) }],
    });
  });

  it("refuses anything else", () => {
    for (const bad of [null, { page: PAGE, fields: [] }, { page: PAGE, fields: [{ id: "nope", text: "" }] }, { fields: [{ id: "steps.0.text", text: "" }] }]) {
      expect(readCheckRequest(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("readCopyCheck", () => {
  const known = new Set(["steps.0.text"]);

  it("keeps remarks on fields sent, with words to sit on", () => {
    const remark = { field: "steps.0.text", quote: "rise", note: "Fine.", fix: "" };
    expect(
      readCopyCheck(
        {
          summary: "Holds up.",
          remarks: [remark, { ...remark, field: "steps.9.text" }, { ...remark, quote: " " }, { ...remark, fix: undefined }],
        },
        known,
      ),
    ).toEqual({ summary: "Holds up.", remarks: [remark, remark] });
  });

  it("refuses what is not a check", () => {
    expect(readCopyCheck({ remarks: [] }, known)).toBeNull();
    expect(readCopyCheck({ summary: "x" }, known)).toBeNull();
  });
});

describe("draft", () => {
  it("saves one trimmed line, and previews text as the column shows it", () => {
    expect(draft("text", "  Drag $A$\nand $B$. ")).toEqual({
      value: "Drag $A$ and $B$.",
      preview: richHtml("Drag $A$ and $B$.", true, linkTex),
      problem: null,
    });
    expect(draft("title", " Drag ")).toEqual({ value: "Drag", preview: null, problem: null });
  });

  it("finds what the lesson tests would refuse", () => {
    expect(draft("title", "Angle $A$").problem).toBe("Titles are plain text, without $…$.");
    expect(draft("text", "   ").problem).toBe("The text cannot be empty.");
    expect(draft("text", "Unbalanced $A").problem).toMatch(/Unbalanced \$/);
    expect(draft("text", "Bad $\\frac{1}$").problem).not.toBeNull();
  });
});

describe("the editor's drafts", () => {
  it("lists every field in reading order, with those built in code as such", () => {
    expect(fieldsOf(listing()).map((f) => [f.id, f.source === null])).toEqual([
      ["steps.0.title", false],
      ["steps.0.text", false],
      ["steps.1.title", true],
      ["steps.1.text", false],
      ["likes.0.title", false],
      ["likes.0.text", false],
    ]);
  });

  it("keeps a draft over the text it was written on, and drops it once back to that text", () => {
    const edited = editField(open(), "likes.0.title", "A wheelchair ramp");
    expect(valueOf(edited, "likes.0.title")).toBe("A wheelchair ramp");
    expect(edited.drafts).toEqual({ "likes.0.title": { base: "A ramp", text: "A wheelchair ramp" } });
    expect(editField(edited, "likes.0.title", "A ramp").drafts).toEqual({});
    expect(discardAll(edited).drafts).toEqual({});
  });

  it("never drafts a field built in code", () => {
    const state = open();
    expect(editField(state, "steps.1.title", "Drag")).toBe(state);
  });

  it("keeps drafts across a reload only where the source still reads as they were written over", () => {
    const kept = {
      "likes.0.title": { base: "A ramp", text: "A wheelchair ramp" },
      "steps.0.title": { base: "Climb", text: "Slope" },
      "steps.7.text": { base: "x", text: "y" },
      "likes.0.text": "not a draft",
    };
    const { state, dropped } = openCopy(listing(), kept);
    expect(state.drafts).toEqual({ "likes.0.title": kept["likes.0.title"] });
    expect(dropped).toBe(2);
    expect(openCopy(listing(), "junk")).toEqual({ state: { listing: listing(), drafts: {}, check: { kind: "none" } }, dropped: 0 });
  });

  it("lets drafts go once saved, on reopening at the source as it now reads", () => {
    const edited = editField(editField(open(), "likes.0.title", "A wheelchair ramp"), "steps.0.title", "Steepness");
    const saved = listing({ likes: { file: "src/lab/lessons/slope.ts", entries: [{ title: "A wheelchair ramp", text: "A ramp of 1 in 12 rises 1 for every 12 along." }] } });
    const { state, dropped } = reopen(edited, saved);
    expect(state.drafts).toEqual({ "steps.0.title": { base: "Rise", text: "Steepness" } });
    expect(dropped).toBe(0);
  });
});

describe("saving", () => {
  it("sends each changed entry once, with all its changed fields, as the source will have them", () => {
    let state = editField(open(), "steps.0.title", "Steepness ");
    state = editField(state, "steps.0.text", "Slope is\nrise over run.");
    state = editField(state, "likes.0.title", "A wheelchair ramp");
    expect(saveOf(state, PAGE)).toEqual({
      page: PAGE,
      edits: [
        { section: "steps", index: 0, was: listing().steps.entries[0], to: { title: "Steepness", text: "Slope is rise over run." } },
        { section: "likes", index: 0, was: listing().likes.entries[0], to: { title: "A wheelchair ramp" } },
      ],
    });
  });

  it("sends nothing when nothing would change, or something cannot be saved", () => {
    expect(saveOf(open(), PAGE)).toBeNull();
    const spaced = editField(open(), "likes.0.title", " A ramp ");
    expect(changed(spaced)).toEqual([]);
    expect(saveOf(spaced, PAGE)).toBeNull();
    const wrong = editField(editField(open(), "likes.0.title", "A wheelchair ramp"), "steps.0.title", "Slope $m$");
    expect(problems(wrong).map((p) => [p.info.id, p.problem])).toEqual([["steps.0.title", "Titles are plain text, without $…$."]]);
    expect(saveOf(wrong, PAGE)).toBeNull();
  });
});

describe("the fact-check", () => {
  const remark = (field: string, quote: string, fix: string) => ({ field, quote, note: "Wrong.", fix }) as CopyCheck["remarks"][number];
  const check: CopyCheck = {
    summary: "One slip.",
    remarks: [remark("likes.0.text", "rises 1 for every 12", "climbs 1 for every 12"), remark("steps.0.text", "rise over run", "")],
  };

  it("sends every field it can change, as it stands", () => {
    const state = editField(open(), "likes.0.title", "A wheelchair ramp");
    expect(checkOf(state, PAGE)).toEqual({
      page: PAGE,
      fields: [
        { id: "steps.0.title", text: "Rise" },
        { id: "steps.0.text", text: listing().steps.entries[0].text },
        { id: "steps.1.text", text: "Drag $A$." },
        { id: "likes.0.title", text: "A wheelchair ramp" },
        { id: "likes.0.text", text: listing().likes.entries[0].text },
      ],
    });
  });

  it("asks once for the copy as it stands, and again once it has changed or the check failed", () => {
    const asked = askCheck(open(), PAGE)!;
    expect(asked.state.check.kind).toBe("checking");
    expect(askCheck(asked.state, PAGE)).toBeNull();
    const done = settleCheck(asked.state, asked.request, { check });
    expect(done.check).toEqual({ kind: "done", sent: JSON.stringify(asked.request.fields), result: check });
    expect(checkedAsItStands(done, PAGE)).toBe(true);
    expect(askCheck(done, PAGE)).toBeNull();
    const edited = editField(done, "likes.0.title", "A wheelchair ramp");
    expect(checkedAsItStands(edited, PAGE)).toBe(false);
    expect(askCheck(edited, PAGE)).not.toBeNull();
    const failed = settleCheck(asked.state, asked.request, { error: "Busy." });
    expect(failed.check).toMatchObject({ kind: "failed", error: "Busy." });
    expect(askCheck(failed, PAGE)).not.toBeNull();
  });

  it("drops a check of copy asked about before another was asked for", () => {
    const first = askCheck(open(), PAGE)!;
    const failed = settleCheck(first.state, first.request, { error: "Busy." });
    const second = askCheck(editField(failed, "likes.0.title", "A wheelchair ramp"), PAGE)!;
    expect(settleCheck(second.state, first.request, { check })).toBe(second.state);
  });

  it("places remarks on their words as they stand, and applies a fix in their place", () => {
    const asked = askCheck(open(), PAGE)!;
    const done = settleCheck(asked.state, asked.request, { check });
    const placed = remarksOf(done);
    expect(placed.get("likes.0.text")).toEqual([{ remark: check.remarks[0], index: 0, place: { start: 18, end: 38 } }]);
    const fixed = applyFix(done, 0);
    expect(valueOf(fixed, "likes.0.text")).toBe("A ramp of 1 in 12 climbs 1 for every 12 along.");
    // Its words are gone, so it shows as dealt with, and is not applied twice.
    expect(remarksOf(fixed).get("likes.0.text")?.[0].place).toBeNull();
    expect(applyFix(fixed, 0)).toBe(fixed);
    // A remark without a fix is the author's to word.
    expect(applyFix(done, 1)).toBe(done);
  });
});
