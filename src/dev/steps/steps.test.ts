// The step editor's page side: reading an edit off the wire, pairing a shown
// step with its source, and what it makes of a draft.

import { describe, expect, it } from "vitest";
import { linkTex } from "../../lab/link.ts";
import { richHtml } from "../../lab/math.ts";
import { draft } from "./draft.ts";
import { pairStep, parseEdit, type StepEdit } from "./wire.ts";

describe("parseEdit", () => {
  const edit: StepEdit = { page: "/angles.html", step: 2, was: { title: "Right", text: null }, field: "title", to: "Right angle" };

  it("accepts a complete edit, with its new text trimmed", () => {
    expect(parseEdit(edit)).toEqual(edit);
    expect(parseEdit({ ...edit, to: "  Right angle \n" })).toEqual(edit);
  });

  it("refuses anything else", () => {
    for (const bad of [null, "edit", { ...edit, step: -1 }, { ...edit, step: 1.5 }, { ...edit, field: "uses" }, { ...edit, to: "  " }, { ...edit, was: { title: 3, text: null } }, { ...edit, was: null }]) {
      expect(parseEdit(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe("pairStep", () => {
  const steps = [
    { title: "Drag", text: "a" },
    { title: null, text: "b" },
    { title: "Watch", text: "c" },
    { title: "Watch", text: "d" },
  ];

  it("takes the step at the same place when the titles agree", () => {
    expect(pairStep(steps, 0, "Drag")).toBe(0);
    expect(pairStep(steps, 3, "Watch")).toBe(3);
  });

  it("otherwise takes the only step with that title", () => {
    expect(pairStep(steps, 2, "Drag")).toBe(0);
  });

  it("finds none for a title built in code, or one it cannot tell apart", () => {
    expect(pairStep(steps, 1, "Built 1")).toBeNull();
    expect(pairStep(steps, 0, "Watch")).toBeNull();
  });
});

describe("draft", () => {
  it("saves one trimmed line, and previews step text as the column shows it", () => {
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
