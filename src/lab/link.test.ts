// Finding the terms in a lesson's mathematics (link.ts): which pieces of
// LaTeX become terms, under what id, and which are left alone.

import { describe, expect, it } from "vitest";
import { linkTex, parseTermId, termAliases, termId } from "./link.ts";
import { texHtml } from "./math.ts";
import { term } from "./scene.ts";

const t = (id: string, tex: string): string => `\\htmlData{term=${id}}{${tex}}`;

describe("linkTex", () => {
  it("marks points, segments and polygons by how many capitals run together", () => {
    expect(linkTex("A")).toBe(t("pt:A", "A"));
    expect(linkTex("AB = AC")).toBe(`${t("seg:A.B", "AB")} = ${t("seg:A.C", "AC")}`);
    expect(linkTex("ABCD")).toBe(t("poly:A.B.C.D", "ABCD"));
  });

  it("reads primes and digit subscripts into the names the figure prints", () => {
    expect(linkTex("A'B'")).toBe(t("seg:A′.B′", "A'B'"));
    expect(linkTex("O_1HO_{2}")).toBe(t("poly:O₁.H.O₂", "O_1HO_{2}"));
    expect(linkTex("r_1")).toBe(t("sym:r₁", "r_1"));
  });

  it("marks angles and triangles together with their sign", () => {
    expect(linkTex("\\angle PED")).toBe(t("ang:P.E.D", "\\angle PED"));
    expect(linkTex("\\angle B + \\triangle ABC")).toBe(`${t("ang:B", "\\angle B")} + ${t("poly:A.B.C", "\\triangle ABC")}`);
  });

  it("marks variables and Greek letters, but not π", () => {
    expect(linkTex("a^2 + \\beta")).toBe(`${t("sym:a", "a")}^2 + ${t("sym:β", "\\beta")}`);
    expect(linkTex("2\\pi r")).toBe(`2\\pi ${t("sym:r", "r")}`);
  });

  it("marks values, with their degree sign", () => {
    expect(linkTex("x = 5.2")).toBe(`${t("sym:x", "x")} = ${t("num:5.2", "5.2")}`);
    expect(linkTex("37^\\circ + 1")).toBe(`${t("num:37", "37^\\circ")} + ${t("num:1", "1")}`);
  });

  it("leaves coefficients, exponents and digit fractions alone", () => {
    expect(linkTex("2\\alpha")).toBe(`2${t("sym:α", "\\alpha")}`);
    expect(linkTex("3b")).toBe(`3${t("sym:b", "b")}`);
    expect(linkTex("2(x)")).toBe(`2(${t("sym:x", "x")})`);
    expect(linkTex("\\tfrac12 + \\frac{1}{2} + \\sqrt2")).toBe("\\tfrac12 + \\frac{1}{2} + \\sqrt2");
    expect(linkTex("\\frac{AB}{2}")).toBe(`\\frac{${t("seg:A.B", "AB")}}{2}`);
  });

  it("leaves text, colours, compound subscripts and the lesson's own terms alone", () => {
    expect(linkTex("\\text{Area of } ABC")).toBe(`\\text{Area of } ${t("poly:A.B.C", "ABC")}`);
    expect(linkTex("\\color{red} h_a")).toBe("\\color{red} h_a");
    const own = term("apex", "A");
    expect(linkTex(`${own} + B`)).toBe(`${own} + ${t("pt:B", "B")}`);
    expect(linkTex("\\htmlClass{held}{3.5}")).toBe(`\\htmlClass{held}{${t("num:3.5", "3.5")}}`);
  });

  it("keeps every lesson-style expression typesetting", () => {
    for (const tex of [
      "\\angle ACB = 3b",
      "XY = XW + WZ + ZY = \\tfrac12 DE + AB",
      "t = \\sqrt{d^2 - (R - r)^2}",
      "\\triangle ABC \\cong \\triangle A'B'C'",
      "\\left(\\tfrac{a+b}{3}, \\tfrac c3\\right)",
    ]) {
      expect(() => texHtml(linkTex(tex), true), tex).not.toThrow();
    }
  });
});

describe("term ids", () => {
  it("round-trip through their string form", () => {
    for (const id of ["pt:A′", "seg:A.B", "ang:P.E.D", "ang:B", "poly:O₁.H.O₂", "sym:α", "num:37.5"]) {
      expect(termId(parseTermId(id)!)).toBe(id);
    }
  });

  it("are told apart from a lesson's own ids", () => {
    expect(parseTermId("alpha")).toBeNull();
    expect(parseTermId("exterior-a")).toBeNull();
  });
});

describe("termAliases", () => {
  it("maps what linkTex would call a lesson's own symbol to the lesson's id", () => {
    const tex = `${term("alpha", "\\alpha")} + ${term("side", "AB")} = ${term("whole", "x + y")}`;
    expect(termAliases(tex)).toEqual(
      new Map([
        ["sym:α", "alpha"],
        ["seg:A.B", "side"],
      ]),
    );
  });
});
