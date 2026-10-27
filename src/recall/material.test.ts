// The recall material's rules: where each piece is kept, when it is stale,
// the versions commands make, and reading commands and the Worker's view.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_STYLE,
  factBasis,
  MAX_INSTRUCTION,
  MAX_STYLE,
  MAX_TEXT,
  MAX_VERSIONS,
  readCommand,
  readItem,
  readMaterialView,
  referenceBasis,
  settle,
  standing,
  styleText,
  targetKey,
  versionFor,
  withVersion,
  type Item,
  type Version,
} from "./material.ts";

const written = (text: string, at: number): Version => ({ text, at, origin: "written" });
const item = (basis: string, ...versions: Version[]): Item => ({ basis, versions });
const fact = { kind: "fact", lesson: "medians", step: 1 } as const;
const reference = { kind: "reference", card: "c1" } as const;

describe("where the material is kept", () => {
  it("keys each piece by what it is about", () => {
    expect(targetKey({ kind: "style" })).toBe("style");
    expect(targetKey(fact)).toBe("fact:medians/1");
    expect(targetKey(reference)).toBe("reference:c1");
  });
});

describe("standing", () => {
  it("is missing, current for the basis it was written for, and stale for any other", () => {
    const basis = factBasis({ title: "Find the centroid", text: "The medians meet at $G$." });
    expect(basis).toBe("Find the centroid\nThe medians meet at $G$.");
    expect(standing(undefined, basis)).toBe("missing");
    expect(standing(item(basis, written("x", 1)), basis)).toBe("current");
    expect(standing(item(basis, written("x", 1)), factBasis({ title: "Find the centroid", text: "Reworded." }))).toBe(
      "stale",
    );
    expect(standing(item(referenceBasis("Why 2:1?"), written("x", 1)), referenceBasis("Why two to one?"))).toBe("stale");
  });
});

describe("versions", () => {
  it("makes a new version current, for the basis now, keeping the history", () => {
    const old = item("old", written("first", 1));
    expect(withVersion(old, "new", written("second", 2))).toEqual(item("new", written("first", 1), written("second", 2)));
    expect(withVersion(undefined, "b", written("only", 1))).toEqual(item("b", written("only", 1)));
  });

  it("lets the oldest versions go past the most kept", () => {
    let held: Item | undefined;
    for (let at = 0; at < MAX_VERSIONS + 5; at++) held = withVersion(held, "b", written(`v${at}`, at));
    expect(held!.versions).toHaveLength(MAX_VERSIONS);
    expect(held!.versions[0].at).toBe(5);
  });

  it("settles a written version only where it is still needed, so the first of two to arrive is kept", () => {
    const first = settle(undefined, "q", written("first", 1));
    expect(settle(first, "q", written("second", 2))).toBe(first);
    expect(settle(first, "q reworded", written("second", 2))).toEqual(item("q reworded", written("first", 1), written("second", 2)));
  });

  it("says what each command makes", () => {
    const held = item("b", written("first", 1), { text: "second", at: 2, origin: "edited" });
    expect(versionFor({ kind: "write", target: fact }, undefined, 9, "fresh")).toEqual(written("fresh", 9));
    expect(versionFor({ kind: "refine", target: fact, instruction: "Shorter." }, held, 9, "short")).toEqual({
      text: "short",
      at: 9,
      origin: "refined",
      instruction: "Shorter.",
    });
    expect(versionFor({ kind: "edit", target: fact, text: "mine" }, held, 9)).toEqual({ text: "mine", at: 9, origin: "edited" });
    expect(versionFor({ kind: "restore", target: fact, at: 1 }, held, 9)).toEqual({
      text: "first",
      at: 9,
      origin: "restored",
      from: 1,
    });
  });

  it("makes nothing to refine or restore where there is nothing", () => {
    expect(versionFor({ kind: "refine", target: fact, instruction: "Shorter." }, undefined, 9, "x")).toBeNull();
    expect(versionFor({ kind: "restore", target: fact, at: 5 }, item("b", written("first", 1)), 9)).toBeNull();
  });
});

describe("the house style", () => {
  it("is the default until edited", () => {
    expect(styleText(undefined)).toBe(DEFAULT_STYLE);
    expect(styleText(item("", written("Mine.", 1)))).toBe("Mine.");
  });
});

describe("readCommand", () => {
  it("reads each command, trimmed", () => {
    expect(readCommand({ kind: "write", target: fact })).toEqual({ kind: "write", target: fact });
    expect(readCommand({ kind: "refine", target: reference, instruction: "  Say why.  " })).toEqual({
      kind: "refine",
      target: reference,
      instruction: "Say why.",
    });
    expect(readCommand({ kind: "edit", target: { kind: "style" }, text: " Be brief. " })).toEqual({
      kind: "edit",
      target: { kind: "style" },
      text: "Be brief.",
    });
    expect(readCommand({ kind: "restore", target: fact, at: 3 })).toEqual({ kind: "restore", target: fact, at: 3 });
  });

  it("refuses what is not a command, or asks Claude to write the house style", () => {
    expect(readCommand(null)).toBeNull();
    expect(readCommand({ kind: "write", target: { kind: "style" } })).toBeNull();
    expect(readCommand({ kind: "refine", target: { kind: "style" }, instruction: "More." })).toBeNull();
    expect(readCommand({ kind: "write", target: { kind: "fact", lesson: "medians", step: -1 } })).toBeNull();
    expect(readCommand({ kind: "write", target: { kind: "reference", card: "" } })).toBeNull();
    expect(readCommand({ kind: "refine", target: fact, instruction: "   " })).toBeNull();
    expect(readCommand({ kind: "edit", target: fact, text: "" })).toBeNull();
    expect(readCommand({ kind: "restore", target: fact, at: "yesterday" })).toBeNull();
    expect(readCommand({ kind: "delete", target: fact })).toBeNull();
  });

  it("refuses text longer than is kept", () => {
    expect(readCommand({ kind: "edit", target: fact, text: "x".repeat(MAX_TEXT + 1) })).toBeNull();
    expect(readCommand({ kind: "edit", target: { kind: "style" }, text: "x".repeat(MAX_STYLE) })).not.toBeNull();
    expect(readCommand({ kind: "refine", target: fact, instruction: "x".repeat(MAX_INSTRUCTION + 1) })).toBeNull();
  });
});

describe("reading what the Worker sends", () => {
  it("reads an item, dropping versions that make no sense", () => {
    expect(readItem({ basis: "b", versions: [written("ok", 1), { text: "", at: 2, origin: "written" }, { text: "x" }] })).toEqual(
      item("b", written("ok", 1)),
    );
    expect(readItem({ basis: "b", versions: [] })).toBeNull();
  });

  it("reads the view of the material, dropping what makes no sense", () => {
    const cards = [{ id: "c1", question: "Why?", lesson: "medians", step: 1, stepTitle: "Find the centroid" }];
    expect(
      readMaterialView({
        items: { "fact:medians/1": item("b", written("x", 1)), broken: { basis: 1 } },
        cards: [...cards, { id: "c2" }],
      }),
    ).toEqual({ items: { "fact:medians/1": item("b", written("x", 1)) }, cards });
    expect(readMaterialView({ cards: [] })).toBeNull();
  });
});
