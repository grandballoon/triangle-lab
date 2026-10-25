import { describe, expect, it } from "vitest";
import { richHtml, texHtml } from "./lab/math.ts";
import type { Readout } from "./lab/scene.ts";
import { inequalityReadouts, perimeterReadout, pythagorasReadouts, tightness } from "./readouts.ts";

/** Every row typesets without a KaTeX warning. */
function typesets(rows: readonly Readout[]): void {
  for (const row of rows) {
    texHtml(row.tex, true);
    if (row.label) richHtml(row.label, true);
  }
}

describe("perimeterReadout", () => {
  const sides = [3.1, 4.2, 5.4] as const;
  const at = (walked: number, halfway: boolean): Readout =>
    perimeterReadout({ name: "Large", sides, walked, halfway });

  it("starts at nothing walked", () => {
    expect(at(0, false)).toEqual({ label: "Large triangle", tex: "p = 0", tone: "dim" });
  });

  it("adds up the sides walked, as written", () => {
    expect(at(1, false).tex).toBe("p = 3.1");
    expect(at(2, false).tex).toBe("p = 3.1 + 4.2 = 7.3");
  });

  it("names the semiperimeter once the knob is past halfway", () => {
    expect(at(2, true).tex).toBe("p = 3.1 + 4.2 = 7.3,\\quad \\text{halfway round: } s = 6.35");
  });

  it("gives p and s in full once the knob is home", () => {
    expect(at(3, true)).toEqual({
      label: "Large triangle",
      tex: "p = 3.1 + 4.2 + 5.4 = 12.7,\\quad s = \\tfrac{p}{2} = 6.35",
      tone: "good",
    });
  });

  it("typesets at every stage", () => {
    typesets([at(0, false), at(1, false), at(2, true), at(3, true)]);
  });
});

describe("inequalityReadouts", () => {
  it("states the inequalities in general before a side is picked", () => {
    const rows = inequalityReadouts(null);
    expect(rows).toHaveLength(1);
    expect(rows[0].tone).toBe("dim");
    typesets(rows);
  });

  it("checks a real triangle", () => {
    const rows = inequalityReadouts({ name: "right 3·4·5", a: 4, b: 3, c: 5 });
    expect(rows[0]).toEqual({
      label: "right 3·4·5: a real triangle: every sum wins",
      tex: "a = 4.00,\\ b = 3.00,\\ c = 5.00",
    });
    expect(rows.slice(1).map((r) => [r.tex, r.tone])).toEqual([
      ["a + b = 7.00 > 5.00 = c", "good"],
      ["b + c = 8.00 > 4.00 = a", "good"],
      ["c + a = 9.00 > 3.00 = b", "good"],
    ]);
    typesets(rows);
  });

  it("shows equality and a warning when the triangle lies flat", () => {
    const rows = inequalityReadouts({ name: "flat", a: 3, b: 2, c: 5 });
    expect(rows[0].label).toContain("degenerate");
    expect(rows[1]).toMatchObject({ tex: "a + b = 5.00 = 5.00 = c", tone: "warn" });
    typesets(rows);
  });

  it("marks a nearly flat triangle as tight", () => {
    const rows = inequalityReadouts({ name: "thin", a: 3, b: 2.2, c: 5 });
    expect(rows[0].label).toContain("nearly flat");
    expect(rows[1].tone).toBe("plain");
  });
});

describe("tightness", () => {
  it("grades the slack of an inequality", () => {
    expect(tightness(0)).toBe("flat");
    expect(tightness(0.3)).toBe("tight");
    expect(tightness(2)).toBe("slack");
  });
});

describe("pythagorasReadouts", () => {
  it("adds the squares on the legs", () => {
    const rows = pythagorasReadouts(3, 4);
    expect(rows.map((r) => r.tex)).toEqual([
      "a = 3.00,\\ b = 4.00",
      "a^2 + b^2 = 9.00 + 16.00 = 25.00 = c^2",
      "c = \\sqrt{25.00} = 5.00",
    ]);
    typesets(rows);
  });
});
