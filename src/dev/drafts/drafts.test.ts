// The draft tab's core: what a save of a draft carries and writes, and the
// tab's state as the author writes, saves and comes back.

import { describe, expect, it } from "vitest";
import type { Deck } from "../../recall/deck.ts";
import { afterSave, blocksOf, canSave, editDraft, keptOf, openDraft, saveOf, unsaved } from "./edit.ts";
import {
  draftFile,
  draftWrites,
  explanationContent,
  explanationFile,
  filesOfSave,
  fromFile,
  MAX_DRAFT,
  parseDraftSave,
  toFile,
  type DraftListing,
  type DraftSave,
} from "./wire.ts";

const PAGE = "/lab.html?lesson=slope";
const save = (over: Partial<DraftSave> = {}): DraftSave => ({ page: PAGE, was: null, text: "# Slope\n\nRise over run.", explanations: [], ...over });

describe("parseDraftSave", () => {
  it("accepts a whole save, and nothing else", () => {
    const good = save({ explanations: [{ lesson: "medians", text: "They meet." }] });
    expect(parseDraftSave(JSON.parse(JSON.stringify(good)))).toEqual(good);
    for (const bad of [
      null,
      { ...good, text: 1 },
      { ...good, was: 2 },
      { ...good, explanations: "x" },
      { ...good, explanations: [{ lesson: "../etc", text: "x" }] },
      { ...good, text: "x".repeat(MAX_DRAFT + 1) },
    ]) {
      expect(parseDraftSave(bad), JSON.stringify(bad).slice(0, 80)).toBeNull();
    }
  });
});

describe("the files a save keeps", () => {
  it("are the lesson's draft and each explanation with something written", () => {
    const s = save({ page: "/slope.html", explanations: [{ lesson: "medians", text: "They meet." }, { lesson: "altitudes", text: "  " }] });
    expect(filesOfSave(s)).toEqual(["lesson-drafts/slope.md", "lesson-drafts/medians.explanation.md"]);
    expect(filesOfSave(save({ page: "/recall.html" }))).toBeNull();
  });

  it("hold a draft ending in one newline, read back as typed", () => {
    expect(toFile("Rise.  \n\n")).toBe("Rise.\n");
    expect(fromFile(toFile("Rise.\n\nRun."))).toBe("Rise.\n\nRun.");
  });
});

describe("draftWrites", () => {
  const none = new Map<string, string | null>();

  it("writes a new draft and the explanations, and says so", () => {
    const s = save({ explanations: [{ lesson: "medians", text: "They meet." }] });
    const writes = draftWrites(s, none);
    expect(writes).toEqual({
      ok: true,
      written: new Map([
        [draftFile("slope"), "# Slope\n\nRise over run.\n"],
        [explanationFile("medians"), explanationContent("They meet.")],
      ]),
      message: "Draft the text of slope, and keep 1 explanation\n\nMade with the draft tab on staging.\n",
    });
  });

  it("writes only what differs from what is there", () => {
    const current = new Map([
      [draftFile("slope"), "# Slope\n\nRise over run.\n"],
      [explanationFile("medians"), explanationContent("They meet.")],
      [explanationFile("altitudes"), null],
    ]);
    const s = save({ was: "# Slope\n\nRise over run.", explanations: [{ lesson: "medians", text: "They meet." }, { lesson: "altitudes", text: "They stand." }] });
    const writes = draftWrites(s, current);
    expect(writes.ok && [...writes.written.keys()]).toEqual([explanationFile("altitudes")]);
    expect(writes.ok && writes.message).toBe("Keep 1 explanation\n\nMade with the draft tab on staging.\n");
    expect(draftWrites({ ...s, explanations: [] }, current)).toMatchObject({ ok: true, written: new Map() });
  });

  it("never writes a blank draft over one", () => {
    const writes = draftWrites(save({ text: " \n" }), none);
    expect(writes.ok && writes.written.size).toBe(0);
  });

  it("refuses a save begun on a draft that has been saved since", () => {
    const current = new Map([[draftFile("slope"), "Saved elsewhere.\n"]]);
    expect(draftWrites(save({ was: null }), current)).toMatchObject({ ok: false, status: 409 });
    expect(draftWrites(save({ was: "Older." }), current)).toMatchObject({ ok: false, status: 409 });
    expect(draftWrites(save({ was: "Saved elsewhere." }), current).ok).toBe(true);
    expect(draftWrites(save({ page: "/recall.html" }), none)).toMatchObject({ ok: false, status: 404 });
  });
});

describe("the tab's state", () => {
  const listing: DraftListing = { lesson: "slope", file: draftFile("slope"), text: "Saved." };

  it("opens on the draft as saved, or on text kept in this browser over it", () => {
    expect(openDraft(listing)).toEqual({ state: { listing, text: "Saved." }, replaces: false });
    expect(openDraft(listing, { base: "Saved.", text: "Saved, and more." })).toEqual({ state: { listing, text: "Saved, and more." }, replaces: false });
    expect(openDraft({ ...listing, text: null }, { base: null, text: "Begun." }).state.text).toBe("Begun.");
  });

  it("says when kept text was written over a draft that has been saved since", () => {
    expect(openDraft(listing, { base: "Older.", text: "Mine." })).toEqual({ state: { listing, text: "Mine." }, replaces: true });
  });

  it("leaves out kept text that is not text, or reads as the draft does", () => {
    for (const kept of [{ text: 3 }, { base: 1, text: "x" }, "x", { base: "Saved.", text: "Saved." }]) {
      expect(openDraft(listing, kept).state.text, JSON.stringify(kept)).toBe("Saved.");
    }
  });

  it("keeps the text in this browser only while it is unsaved", () => {
    const { state } = openDraft(listing);
    expect(unsaved(state)).toBe(false);
    expect(keptOf(state)).toBeNull();
    const edited = editDraft(state, "New.");
    expect(unsaved(edited)).toBe(true);
    expect(keptOf(edited)).toEqual({ base: "Saved.", text: "New." });
    expect(editDraft(edited, "New.")).toBe(edited);
  });

  it("has a draft to save only once its text changes, and not when it is blank", () => {
    const { state } = openDraft(listing);
    expect(canSave(state)).toBe(false);
    expect(canSave(editDraft(state, "New."))).toBe(true);
    expect(canSave(editDraft(state, "  \n"))).toBe(false);
    expect(canSave(openDraft({ ...listing, text: null }).state)).toBe(false);
  });

  it("saves the text over the draft it began on, with every explanation written", () => {
    const deck = { explanations: [{ lesson: "medians", text: "They meet.", checked: null, updated: 1 }, { lesson: "angles", text: "", checked: null, updated: 1 }] } as unknown as Deck;
    const state = editDraft(openDraft(listing).state, "New.");
    expect(saveOf(state, PAGE, deck)).toEqual({ page: PAGE, was: "Saved.", text: "New.", explanations: [{ lesson: "medians", text: "They meet." }] });
    expect(saveOf(state, PAGE, {} as Deck).explanations).toEqual([]);
  });

  it("reads as saved after a save, keeping what was typed during it", () => {
    const state = editDraft(openDraft(listing).state, "New.  ");
    const sent = saveOf(state, PAGE, {} as Deck);
    const after = afterSave(state, sent);
    expect(after).toEqual({ listing: { ...listing, text: "New." }, text: "New." });
    expect(unsaved(after)).toBe(false);
    const typedOn = afterSave(editDraft(state, "New. More."), sent);
    expect(typedOn.text).toBe("New. More.");
    expect(unsaved(typedOn)).toBe(true);
    const blank = editDraft(state, "");
    expect(afterSave(blank, saveOf(blank, PAGE, {} as Deck))).toBe(blank);
  });
});

describe("blocksOf", () => {
  it("reads headings, and paragraphs between blank lines", () => {
    expect(blocksOf("# Slope\n\nRise\nover run.\n\n\n## Why\nRamps.")).toEqual([
      { kind: "heading", level: 1, text: "Slope" },
      { kind: "paragraph", text: "Rise over run." },
      { kind: "heading", level: 2, text: "Why" },
      { kind: "paragraph", text: "Ramps." },
    ]);
    expect(blocksOf("#### Not a heading\n#nor this")).toEqual([{ kind: "paragraph", text: "#### Not a heading #nor this" }]);
    expect(blocksOf("  \n")).toEqual([]);
  });
});
