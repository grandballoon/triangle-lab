// Finding a lesson's copy in source and rewriting it, on small sources
// written here and on every real lesson: each step, likeness and use a
// learner sees must be found in its file as it reads on screen, so the
// editor can change it.

import { parse } from "@babel/parser";
import { describe, expect, it } from "vitest";
import { asides } from "../../asides.ts";
import asidesSource from "../../asides.ts?raw";
import { directions } from "../../directions.ts";
import directionsSource from "../../directions.ts?raw";
import { Scene, type LessonBuilder } from "../../lab/scene.ts";
import { lessons } from "../../lessons.ts";
import type { EntryEdit } from "./wire.ts";
import { ASIDES_FILE, DIRECTIONS_FILE, encode, entriesIn, entryName, filesOf, homesOf, lessonOf, listing, rewriteEntry, rewriteFile, type Home } from "./source.ts";

describe("homesOf", () => {
  it("finds a lab lesson's module for all its copy", () => {
    const home = { file: "src/lab/lessons/slope.ts", path: null };
    expect(homesOf("/lab.html?lesson=slope")).toEqual({ steps: home, likes: home, uses: home });
    expect(homesOf("/lab.html?lesson=box-diagonal#step-2")?.steps.file).toBe("src/lab/lessons/box-diagonal.ts");
    expect(lessonOf("/lab.html?lesson=slope")).toEqual({ slug: "slope", lab: true });
  });

  it("finds a standalone page's directions and asides", () => {
    const homes = homesOf("/angles.html")!;
    expect(homes).toEqual({
      steps: { file: DIRECTIONS_FILE, path: ["directions", "angles"] },
      likes: { file: ASIDES_FILE, path: ["asides", "angles", "likes"] },
      uses: { file: ASIDES_FILE, path: ["asides", "angles", "uses"] },
    });
    expect(homesOf("/angles")).toEqual(homes);
    expect(filesOf(homes)).toEqual([DIRECTIONS_FILE, ASIDES_FILE]);
  });

  it("finds nothing for pages without copy, or names that could leave the folder", () => {
    for (const page of ["/", "/index.html", "/recall.html", "/signin.html", "/lab.html", "/lab.html?lesson=../vite.config", "/lab.html?lesson=Slope", "/a%2Fb.html"]) {
      expect(homesOf(page), page).toBeNull();
    }
  });
});

const LAB: Home = { file: "lesson.ts", path: null };

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
  likes: [{ title: "A ramp", text: "It rises." }],
  uses: [],
  draw() {},
}));
`;

describe("entriesIn", () => {
  it("lists a lab module's sections as written, and which fields are plain literals", () => {
    expect(listing(entriesIn(LESSON, LAB, "steps"))).toEqual([
      { title: "First", text: "Drag $A$." },
      { title: "Second", text: "Then \\angle" },
      { title: null, text: "Computed title" },
      { title: null, text: null },
    ]);
    expect(listing(entriesIn(LESSON, LAB, "likes"))).toEqual([{ title: "A ramp", text: "It rises." }]);
    expect(entriesIn(LESSON, LAB, "uses")).toEqual([]);
  });

  it("records each literal's span and quote", () => {
    const [first, second] = entriesIn(LESSON, LAB, "steps");
    const at = LESSON.indexOf(`"Drag $A$."`);
    expect(first.text).toEqual({ start: at, end: at + `"Drag $A$."`.length, quote: '"', value: "Drag $A$." });
    expect(second.title?.quote).toBe("'");
    expect(second.text?.quote).toBe("`");
  });

  it("lists one page's entries at a path", () => {
    const source = `export const asides: Record<string, Asides> = {
  angles: { likes: [{ title: "Door", text: "Opens." }], uses: [] },
  "two-words": { likes: [{ title: "Other", text: "Not angles." }], uses: [] },
};`;
    const at = (slug: string): Home => ({ file: "asides.ts", path: ["asides", slug, "likes"] });
    expect(listing(entriesIn(source, at("angles"), "likes"))).toEqual([{ title: "Door", text: "Opens." }]);
    expect(listing(entriesIn(source, at("two-words"), "likes"))).toEqual([{ title: "Other", text: "Not angles." }]);
    expect(entriesIn(source, at("missing"), "likes")).toEqual([]);
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
      "line\nbreak\ttab\r \u0001",
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

describe("rewriteEntry", () => {
  const edit = (over: Partial<EntryEdit>): EntryEdit => ({
    section: "steps",
    index: 0,
    was: { title: "First", text: "Drag $A$." },
    to: { text: "Drag $B$ instead." },
    ...over,
  });

  it("replaces only the entry's literals, keeping their quotes", () => {
    expect(rewriteEntry(LESSON, LAB, edit({}))).toEqual({
      ok: true,
      changed: true,
      source: LESSON.replace(`"Drag $A$."`, `"Drag $B$ instead."`),
    });
    expect(rewriteEntry(LESSON, LAB, edit({ index: 1, was: { title: "Second", text: "Then \\angle" }, to: { title: "It's second", text: "Then \\beta" } }))).toEqual({
      ok: true,
      changed: true,
      source: LESSON.replace(`'Second'`, `'It\\'s second'`).replace("`Then \\\\angle`", "`Then \\\\beta`"),
    });
    expect(rewriteEntry(LESSON, LAB, edit({ section: "likes", was: { title: "A ramp", text: "It rises." }, to: { title: "A wheelchair ramp" } }))).toEqual({
      ok: true,
      changed: true,
      source: LESSON.replace(`"A ramp"`, `"A wheelchair ramp"`),
    });
  });

  it("finds the entry by what was shown when its place has moved", () => {
    const result = rewriteEntry(LESSON, LAB, edit({ index: 5 }));
    expect(result.ok && result.source).toBe(LESSON.replace(`"Drag $A$."`, `"Drag $B$ instead."`));
  });

  it("leaves the source alone when nothing changes", () => {
    expect(rewriteEntry(LESSON, LAB, edit({ to: { text: "Drag $A$." } }))).toEqual({ ok: true, changed: false, source: LESSON });
  });

  it("refuses an entry that has changed, a field built in code, and an entry it cannot tell apart", () => {
    expect(rewriteEntry(LESSON, LAB, edit({ was: { title: "First", text: "Old" } }))).toEqual({
      ok: false,
      error: "Step 1 has changed in the source since it was shown. Reload the page.",
    });
    expect(rewriteEntry(LESSON, LAB, edit({ index: 2, was: { title: null, text: "Computed title" }, to: { title: "Third" } }))).toEqual({
      ok: false,
      error: "The title of step 3 is built in code; edit it by hand.",
    });
    const twice = LESSON.replace(`{ title: 'Second', text: \`Then \\\\angle\` }`, `{ title: "First", text: "Drag $A$." }`);
    expect(rewriteEntry(twice, LAB, edit({ index: 3 }))).toEqual({ ok: false, error: "Several entries read as step 4 does; edit it by hand." });
    expect(rewriteEntry(twice, LAB, edit({ index: 1 }))).toMatchObject({ ok: true, changed: true });
  });

  it("rewrites one page's entries and no other's", () => {
    const source = `export const directions = {
  a: [{ title: "Same", text: "Same text" }],
  b: [{ title: "Same", text: "Same text" }],
};`;
    const home: Home = { file: "directions.ts", path: ["directions", "b"] };
    const result = rewriteEntry(source, home, edit({ was: { title: "Same", text: "Same text" }, to: { text: "Changed" } }));
    expect(result.ok && result.source).toBe(source.replace(`b: [{ title: "Same", text: "Same text" }]`, `b: [{ title: "Same", text: "Changed" }]`));
  });

  it("names entries as the author sees them", () => {
    expect([entryName("steps", 0), entryName("likes", 1), entryName("uses", 2)]).toEqual(["step 1", "likeness 2", "use 3"]);
  });
});

describe("rewriteFile", () => {
  const homes = homesOf("/angles.html")!;
  const directionsFile = `export const directions = { angles: [{ title: "Drag", text: "Move it." }] };`;
  const asidesFile = `export const asides = { angles: { likes: [{ title: "Door", text: "Opens." }], uses: [{ title: "Roofs", text: "Pitch." }] } };`;
  const edits: EntryEdit[] = [
    { section: "steps", index: 0, was: { title: "Drag", text: "Move it." }, to: { title: "Pull" } },
    { section: "likes", index: 0, was: { title: "Door", text: "Opens." }, to: { text: "Swings open." } },
    { section: "uses", index: 0, was: { title: "Roofs", text: "Pitch." }, to: { title: "Roof pitch" } },
  ];

  it("makes every edit to its file, and only those", () => {
    expect(rewriteFile(directionsFile, DIRECTIONS_FILE, homes, edits)).toEqual({ ok: true, changed: true, source: directionsFile.replace('"Drag"', '"Pull"') });
    expect(rewriteFile(asidesFile, ASIDES_FILE, homes, edits)).toEqual({
      ok: true,
      changed: true,
      source: asidesFile.replace('"Opens."', '"Swings open."').replace('"Roofs"', '"Roof pitch"'),
    });
    expect(rewriteFile(directionsFile, DIRECTIONS_FILE, homes, edits.slice(1))).toEqual({ ok: true, changed: false, source: directionsFile });
  });

  it("refuses the file whole if one edit to it is refused", () => {
    const stale = { ...edits[2], was: { title: "Old", text: "Pitch." } };
    expect(rewriteFile(asidesFile, ASIDES_FILE, homes, [edits[1], stale])).toEqual({
      ok: false,
      error: "Use 1 has changed in the source since it was shown. Reload the page.",
    });
  });
});

describe("every lesson's copy", () => {
  it("is found in src/directions.ts and src/asides.ts as each standalone page shows it", () => {
    for (const [slug, steps] of Object.entries(directions)) {
      const homes = homesOf(`/${slug}.html`)!;
      expect(listing(entriesIn(directionsSource, homes.steps, "steps")), slug).toEqual(steps);
      const shown = asides[slug] ?? { likes: [], uses: [] };
      expect(listing(entriesIn(asidesSource, homes.likes, "likes")), `${slug} likes`).toEqual(shown.likes);
      expect(listing(entriesIn(asidesSource, homes.uses, "uses")), `${slug} uses`).toEqual(shown.uses);
    }
  });

  const modules = import.meta.glob<{ default: LessonBuilder }>("../../lab/lessons/*.ts", { eager: true });
  const sources = import.meta.glob<string>("../../lab/lessons/*.ts", { query: "?raw", import: "default", eager: true });
  it.each(lessons.filter((l) => l.lab).map((l) => [l.slug, l] as const))("is found in the module of %s as it shows it", (slug, meta) => {
    const homes = homesOf(`/lab.html?lesson=${slug}`)!;
    expect(homes.steps.file).toBe(`src/lab/lessons/${slug}.ts`);
    const path = `../../lab/lessons/${slug}.ts`;
    const view = modules[path].default(new Scene(meta.accent));
    for (const section of ["steps", "likes", "uses"] as const) {
      const shown = view[section].map(({ title, text }) => ({ title, text }));
      expect(listing(entriesIn(sources[path], homes[section], section)), section).toEqual(shown);
    }
  });
});
