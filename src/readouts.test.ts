import { describe, expect, it } from "vitest";
import { richHtml, texHtml } from "./lab/math.ts";
import type { Readout } from "./lab/scene.ts";
import {
  congruenceReadout,
  foldOf,
  fortyFiveReadouts,
  inequalityReadouts,
  matches,
  perimeterReadout,
  pythagorasReadouts,
  similarReadouts,
  tableReadouts,
  thirtySixtyReadouts,
  tightness,
  trigReadouts,
} from "./readouts.ts";

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

describe("congruenceReadout", () => {
  const cell = (measured: number, pinned: boolean, twoTriangles = false) =>
    congruenceReadout({
      key: twoTriangles ? "SSA" : "SAS",
      givens: "$AB$, $\\angle A$, $AC$",
      checks: [
        { name: "\\angle A", kind: "angle", measured, given: 40 },
        { name: "AC", kind: "side", measured: 3, given: 3 },
      ],
      pinned,
      twoTriangles,
    });

  it("ticks the givens that match and shows the ones that do not", () => {
    expect(cell(33.2, false)).toEqual({
      label: "SAS: given $AB$, $\\angle A$, $AC$; drag $C$ until every given checks out",
      tex: "AB = 4.00\\,\\checkmark,\\quad \\angle A = 33^\\circ \\ne 40^\\circ,\\quad AC = 3.00\\,\\checkmark",
    });
    typesets([cell(33.2, false), cell(40, true), cell(40, false, true), cell(40, true, true)]);
  });

  it("says what pinning C proves", () => {
    expect(cell(40, true)).toMatchObject({ label: "SAS pins down this one triangle", tone: "good" });
    expect(cell(40, true, true)).toMatchObject({ label: "SSA: same givens, two different triangles", tone: "warn" });
  });

  it("matches a measurement within its tolerance", () => {
    expect(matches({ name: "AC", kind: "side", measured: 3.05, given: 3 })).toBe(true);
    expect(matches({ name: "AC", kind: "side", measured: 3.1, given: 3 })).toBe(false);
    expect(matches({ name: "\\angle A", kind: "angle", measured: 41.5, given: 40 })).toBe(true);
  });
});

describe("similarReadouts", () => {
  it("works each ratio out in every triangle, the learner's first", () => {
    const rows = similarReadouts(30, [4, 2]);
    expect(rows[0].tex).toBe("\\frac{\\text{opp}}{\\text{hyp}} = \\frac{2.00}{4.00} = \\frac{1.00}{2.00} = 0.500");
    expect(rows[3].tex).toBe("90^\\circ,\\quad \\theta = 30.0^\\circ,\\quad 90^\\circ - \\theta = 60.0^\\circ");
    typesets(rows);
  });
});

describe("trigReadouts", () => {
  it("builds the six ratios at A from the sides", () => {
    const rows = trigReadouts({ focus: "A", a: 3, b: 4 });
    expect(rows.map((r) => r.tex).slice(0, 4)).toEqual([
      "\\sin A = \\frac{\\text{opp}}{\\text{hyp}} = \\frac{a}{c} = \\frac{3.00}{5.00} = 0.600",
      "\\cos A = \\frac{\\text{adj}}{\\text{hyp}} = \\frac{b}{c} = \\frac{4.00}{5.00} = 0.800",
      "\\tan A = \\frac{\\text{opp}}{\\text{adj}} = \\frac{a}{b} = \\frac{3.00}{4.00} = 0.750",
      "\\csc A = \\frac{c}{a} = 1.667,\\quad \\sec A = \\frac{c}{b} = 1.250,\\quad \\cot A = \\frac{b}{a} = 1.333",
    ]);
    expect(rows[0].label).toContain("36.9^\\circ");
    typesets(rows);
  });

  it("trades opposite and adjacent at B, where sin B is cos A", () => {
    const rows = trigReadouts({ focus: "B", a: 3, b: 4 });
    expect(rows[0].tex).toBe("\\sin B = \\frac{\\text{opp}}{\\text{hyp}} = \\frac{b}{c} = \\frac{4.00}{5.00} = 0.800");
    expect(rows[4].tex).toBe("\\sin B = \\frac{b}{c} = \\cos A = 0.800");
    expect(rows[5].tex).toBe("\\sin^2 B + \\cos^2 B = \\frac{a^2 + b^2}{c^2} = \\frac{9.00 + 16.00}{25.00} = 1");
    typesets(rows);
  });
});

describe("foldOf", () => {
  it("names the stage of a fold", () => {
    expect([foldOf(0), foldOf(0.4), foldOf(1)]).toEqual(["open", "folding", "folded"]);
  });
});

describe("fortyFiveReadouts", () => {
  it("finds the hypotenuse and lights up once the halves match", () => {
    const rows = fortyFiveReadouts(2, "folded");
    expect(rows[0]).toMatchObject({ tex: "\\text{hyp} = \\sqrt{a^2 + a^2} = \\sqrt{8.00} = a\\sqrt{2} = 2.83", tone: "good" });
    expect(fortyFiveReadouts(2, "open")[0].tone).toBe("plain");
    typesets([...rows, ...fortyFiveReadouts(3.4, "open"), ...fortyFiveReadouts(1.6, "folding")]);
  });
});

describe("thirtySixtyReadouts", () => {
  it("finds the long leg and the ratio of the sides", () => {
    const rows = thirtySixtyReadouts(1, "folding");
    expect(rows[0].tex).toBe("\\text{long leg} = \\sqrt{(2a)^2 - a^2} = \\sqrt{3a^2} = a\\sqrt{3} = 1.73");
    expect(rows[1].tex).toBe("a : a\\sqrt{3} : 2a = 1.00 : 1.73 : 2.00 = 1 : \\sqrt{3} : 2");
    typesets([...rows, ...thirtySixtyReadouts(1.8, "open"), ...thirtySixtyReadouts(0.9, "folded")]);
  });
});

describe("tableReadouts", () => {
  it("shows exact values on a landmark and lights its row of the table", () => {
    const rows = tableReadouts(30, 30);
    expect(rows[0]).toMatchObject({ tone: "good" });
    expect(rows[0].tex).toBe(
      "\\theta = 30^\\circ:\\quad \\sin = \\tfrac{1}{2},\\ \\cos = \\tfrac{\\sqrt{3}}{2},\\ \\tan = \\tfrac{\\sqrt{3}}{3},\\ " +
        "\\sec = \\tfrac{2\\sqrt{3}}{3},\\ \\csc = 2,\\ \\cot = \\sqrt{3}",
    );
    expect(rows.slice(2).map((r) => r.tone)).toEqual(["plain", "good", "plain", "plain", "plain"]);
    typesets(rows);
  });

  it("shows decimals between landmarks", () => {
    const rows = tableReadouts(37.4, null);
    expect(rows[0].tex).toBe(
      "\\theta = 37.4^\\circ:\\quad \\sin = 0.61,\\ \\cos = 0.79,\\ \\tan = 0.76,\\ \\sec = 1.26,\\ \\csc = 1.65,\\ \\cot = 1.31",
    );
    expect(rows.slice(2).every((r) => r.tone === "plain")).toBe(true);
    typesets(rows);
  });

  it("warns at the flat ends, where some ratios divide by zero", () => {
    for (const end of [0, 90]) {
      const rows = tableReadouts(end, end);
      expect(rows[0].tone).toBe("warn");
      expect(rows[0].tex).toContain("\\text{undefined}");
      typesets(rows);
    }
  });
});

