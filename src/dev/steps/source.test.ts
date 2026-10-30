// Finding steps in source and rewriting one, on small sources written here
// and on every real lesson: each step a learner sees must be found in its
// file as it reads on screen, so the editor can change it.

import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";
import { directions } from "../../directions.ts";
import directionsSource from "../../directions.ts?raw";
import type { StepEdit } from "./wire.ts";
import { Scene, type LessonBuilder } from "../../lab/scene.ts";
import { lessons } from "../../lessons.ts";
import { DIRECTIONS_FILE, encode, homeOf, listing, rewriteStep, stepsIn } from "./source.ts";


describe("homeOf", () => {
  it("finds a lab lesson's module and a standalone page's directions", () => {
    expect(homeOf("/lab.html?lesson=slope")).toEqual({ file: "src/lab/lessons/slope.ts", key: null });
    expect(homeOf("/lab.html?lesson=box-diagonal#step-2")).toEqual({ file: "src/lab/lessons/box-diagonal.ts", key: null });
    expect(homeOf("/angles.html")).toEqual({ file: DIRECTIONS_FILE, key: "angles" });
    expect(homeOf("/angles")).toEqual({ file: DIRECTIONS_FILE, key: "angles" });
  });

  it("finds nothing for pages without steps, or names that could leave the folder", () => {
    for (const page of ["/", "/index.html", "/recall.html", "/lab.html", "/lab.html?lesson=../vite.config", "/lab.html?lesson=Slope", "/a%2Fb.html"]) {
      expect(homeOf(page), page).toBeNull();
    }
  });
});

const LESSON = `import { lesson } from "../scene.ts";
const extra = { title: "Kept", text: "From a variable" };
export default lesson(() => ({
  // steps: ["not this"]
  steps: [
    { title: "First", text: "Drag $A$." },
    { title: 'Second', text: \`Then \\\\angle\` },
    { title: \`Built \${1}\`, text: "Computed title" },
    extra,
  ],
  draw() {},
}));
`;

describe("stepsIn", () => {
  it("lists a lab module's steps as written, and which fields are plain literals", () => {
    expect(listing(stepsIn(LESSON, null))).toEqual([
      { title: "First", text: "Drag $A$." },
      { title: "Second", text: "Then \\angle" },
      { title: null, text: "Computed title" },
      { title: null, text: null },
    ]);
  });

  it("records each literal's span and quote", () => {
    const [first, second] = stepsIn(LESSON, null);
    const at = LESSON.indexOf(`"Drag $A$."`);
    expect(first.text).toEqual({ start: at, end: at + `"Drag $A$."`.length, quote: '"', value: "Drag $A$." });
    expect(second.title?.quote).toBe("'");
    expect(second.text?.quote).toBe("`");
  });

  it("lists one page's directions", () => {
    const source = `export const directions: Record<string, Step[]> = {
  angles: [{ title: "Drag", text: "Move it." }],
  "two-words": [{ title: "Other", text: "Not angles." }],
};`;
    expect(listing(stepsIn(source, "angles"))).toEqual([{ title: "Drag", text: "Move it." }]);
    expect(listing(stepsIn(source, "two-words"))).toEqual([{ title: "Other", text: "Not angles." }]);
    expect(stepsIn(source, "missing")).toEqual([]);
  });
});

describe("encode", () => {
  const read = (literal: string): string => {
    const statement = parse(`x = ${literal};`).program.body[0];
    if (statement.type !== "ExpressionStatement" || statement.expression.type !== "AssignmentExpression") throw new Error(literal);
    const value = statement.expression.right;
    if (value.type === "StringLiteral") return value.value;
    if (value.type === "TemplateLiteral") return value.quasis[0].value.cooked ?? "";
    throw new Error(literal);
  };

  it("writes literals that read back as the same text, in each quote", () => {
    const values = [
      "plain",
      "$\\angle ABC = 90^\\circ$",
      `quotes " ' and \` all`,
      "a ${b} c $ {",
      "line\nbreak\ttab\r \u0001",
      "ends with \\",
      "π · √2 — fine",
    ];
    for (const quote of ['"', "'", "`"] as const) {
      for (const value of values) expect(read(encode(value, quote)), `${quote} ${value}`).toBe(value);
    }
  });

  it("writes the source style the lessons use", () => {
    expect(encode("Bring $90^\\circ$ in.", '"')).toBe('"Bring $90^\\\\circ$ in."');
  });
});

describe("rewriteStep", () => {
  const edit = (over: Partial<StepEdit>): StepEdit => ({
    page: "/lab.html?lesson=x",
    step: 0,
    was: { title: "First", text: "Drag $A$." },
    field: "text",
    to: "Drag $B$ instead.",
    ...over,
  });

  it("replaces only the step's literal, keeping its quote", () => {
    expect(rewriteStep(LESSON, null, edit({}))).toEqual({
      ok: true,
      changed: true,
      source: LESSON.replace(`"Drag $A$."`, `"Drag $B$ instead."`),
    });
    expect(rewriteStep(LESSON, null, edit({ step: 1, was: { title: "Second", text: "Then \\angle" }, field: "title", to: "It's second" }))).toEqual({
      ok: true,
      changed: true,
      source: LESSON.replace(`'Second'`, `'It\\'s second'`),
    });
  });

  it("finds the step by what was shown when its place has moved", () => {
    const result = rewriteStep(LESSON, null, edit({ step: 5 }));
    expect(result.ok && result.source).toBe(LESSON.replace(`"Drag $A$."`, `"Drag $B$ instead."`));
  });

  it("leaves the source alone when nothing changes", () => {
    expect(rewriteStep(LESSON, null, edit({ to: "Drag $A$." }))).toEqual({ ok: true, changed: false, source: LESSON });
  });

  it("refuses a step that has changed, a field built in code, and a step it cannot tell apart", () => {
    expect(rewriteStep(LESSON, null, edit({ was: { title: "First", text: "Old" } }))).toMatchObject({ ok: false });
    expect(rewriteStep(LESSON, null, edit({ step: 2, was: { title: null, text: "Computed title" }, field: "title" }))).toEqual({
      ok: false,
      error: "This step's title is built in code; edit it by hand.",
    });
    const twice = LESSON.replace(`{ title: 'Second', text: \`Then \\\\angle\` }`, `{ title: "First", text: "Drag $A$." }`);
    expect(rewriteStep(twice, null, edit({ step: 3 }))).toEqual({ ok: false, error: "Several steps read the same; edit this one by hand." });
    expect(rewriteStep(twice, null, edit({ step: 1 }))).toMatchObject({ ok: true, changed: true });
  });

  it("rewrites one page's directions and no other's", () => {
    const source = `export const directions = {
  a: [{ title: "Same", text: "Same text" }],
  b: [{ title: "Same", text: "Same text" }],
};`;
    const result = rewriteStep(source, "b", edit({ was: { title: "Same", text: "Same text" }, to: "Changed" }));
    expect(result.ok && result.source).toBe(source.replace(`b: [{ title: "Same", text: "Same text" }]`, `b: [{ title: "Same", text: "Changed" }]`));
  });
});

describe("every lesson's steps", () => {
  it("are found in src/directions.ts as each standalone page shows them", () => {
    const source = directionsSource;
    for (const [slug, steps] of Object.entries(directions)) {
      expect(listing(stepsIn(source, slug)), slug).toEqual(steps);
    }
  });

  const modules = import.meta.glob<{ default: LessonBuilder }>("../../lab/lessons/*.ts", { eager: true });
  const sources = import.meta.glob<string>("../../lab/lessons/*.ts", { query: "?raw", import: "default", eager: true });
  it.each(lessons.filter((l) => l.lab).map((l) => [l.slug, l] as const))("are found in the module of %s as it shows them", (slug, meta) => {
    expect(homeOf(`/lab.html?lesson=${slug}`)).toEqual({ file: `src/lab/lessons/${slug}.ts`, key: null });
    const path = `../../lab/lessons/${slug}.ts`;
    const view = modules[path].default(new Scene(meta.accent));
    const shown = view.steps.map(({ title, text }) => ({ title, text }));
    expect(listing(stepsIn(sources[path], null))).toEqual(shown);
  });
});
