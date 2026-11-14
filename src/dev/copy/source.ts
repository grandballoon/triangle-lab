// Finding a lesson's copy in its source and rewriting entries there, for the
// copy editor, on the dev server (tools/copy-editor-plugin.ts) and on staging
// (worker/staging.ts). Pure: source text in, source text out; the callers do
// the reading and writing.
//
// A lab lesson writes all its copy in its module (src/lab/lessons): the
// `steps`, `likes` and `uses` arrays. A standalone page writes its steps as
// its entry in `directions` (src/directions.ts) and its asides as its entry
// in `asides` (src/asides.ts). Either way an entry is an object literal, and
// a field the editor can change is one written as a plain string literal.
// The source is parsed (Babel's parser, small enough for a Worker) rather
// than matched with patterns, so comments, other strings and formatting
// never confuse it, and a rewrite touches only the literal's span.

import { parse } from "@babel/parser";
import type * as t from "@babel/types";
import { lessonOf } from "../lesson.ts";
import { SECTIONS, type Entry, type EntryEdit, type Field, type Section } from "./wire.ts";

export { lessonOf };

export const DIRECTIONS_FILE = "src/directions.ts";
export const ASIDES_FILE = "src/asides.ts";

/** Where one section of a page's copy is written. */
export interface Home {
  file: string;
  /**
   * The way from a top-level `const` to the section's array, as
   * `["directions", "angles"]` or `["asides", "angles", "likes"]`; null for a
   * lab module, every one of whose arrays named after the section is the
   * lesson's.
   */
  path: string[] | null;
}

export type Homes = Record<Section, Home>;

/** Where each section of `page`'s copy is written, or null for a page without any. */
export function homesOf(page: string): Homes | null {
  const lesson = lessonOf(page);
  if (!lesson) return null;
  const { slug } = lesson;
  if (lesson.lab) {
    const home = { file: `src/lab/lessons/${slug}.ts`, path: null };
    return { steps: home, likes: home, uses: home };
  }
  return {
    steps: { file: DIRECTIONS_FILE, path: ["directions", slug] },
    likes: { file: ASIDES_FILE, path: ["asides", slug, "likes"] },
    uses: { file: ASIDES_FILE, path: ["asides", slug, "uses"] },
  };
}

/** The files `homes` name, each once, in order. */
export const filesOf = (homes: Homes): string[] => [...new Set(SECTIONS.map((s) => homes[s].file))];

type Quote = '"' | "'" | "`";

/** A plain string literal in the source: its span, quote and value. */
export interface Literal {
  start: number;
  end: number;
  quote: Quote;
  value: string;
}

/** One entry of the source, with each field that is a plain literal. */
export type Located = Record<Field, Literal | null>;

const nameOf = (key: t.ObjectProperty["key"]): string | null =>
  key.type === "Identifier" ? key.name : key.type === "StringLiteral" ? key.value : null;

/** An expression without the `as`, `satisfies` and `!` around it. */
function bare(node: t.Node): t.Node {
  while (node.type === "TSAsExpression" || node.type === "TSSatisfiesExpression" || node.type === "TSNonNullExpression") {
    node = node.expression;
  }
  return node;
}

/** The value of property `name` of an object literal, if it is written there. */
function property(object: t.ObjectExpression, name: string): t.Node | null {
  for (const p of object.properties) {
    if (p.type === "ObjectProperty" && !p.computed && nameOf(p.key) === name) return bare(p.value);
  }
  return null;
}

function literal(node: t.Node | null, source: string): Literal | null {
  if (!node || node.start == null || node.end == null) return null;
  const at = { start: node.start, end: node.end, quote: source[node.start] as Quote };
  if (node.type === "StringLiteral") return { ...at, value: node.value };
  const cooked = node.type === "TemplateLiteral" && node.expressions.length === 0 ? node.quasis[0].value.cooked : null;
  return cooked == null ? null : { ...at, value: cooked };
}

/** The entries of one array literal, in order; an element that is not an object literal has no fields. */
function entriesOf(array: t.ArrayExpression, source: string): Located[] {
  return array.elements.map((element) => {
    const object = element && bare(element);
    if (object?.type !== "ObjectExpression") return { title: null, text: null };
    return { title: literal(property(object, "title"), source), text: literal(property(object, "text"), source) };
  });
}

const isNode = (v: unknown): v is t.Node => typeof v === "object" && v !== null && typeof (v as t.Node).type === "string";
/** Keys of a node that hold no children. */
const NOT_CHILDREN = new Set(["loc", "extra", "leadingComments", "trailingComments", "innerComments"]);

/** Every array literal assigned to a property `name`, in source order. */
function arraysNamed(file: t.File, name: string): t.ArrayExpression[] {
  const found: t.ArrayExpression[] = [];
  const visit = (node: t.Node): void => {
    if (node.type === "ObjectProperty" && !node.computed && nameOf(node.key) === name) {
      const value = bare(node.value);
      if (value.type === "ArrayExpression") found.push(value);
    }
    for (const [key, child] of Object.entries(node)) {
      if (NOT_CHILDREN.has(key)) continue;
      if (Array.isArray(child)) child.filter(isNode).forEach(visit);
      else if (isNode(child)) visit(child);
    }
  };
  visit(file);
  return found;
}

/** The array literal at `path`: a top-level `const`, then property after property. */
function arrayAt(file: t.File, [name, ...keys]: string[]): t.ArrayExpression | null {
  for (let statement of file.program.body) {
    if (statement.type === "ExportNamedDeclaration" && statement.declaration) statement = statement.declaration;
    if (statement.type !== "VariableDeclaration") continue;
    for (const d of statement.declarations) {
      if (d.id.type !== "Identifier" || d.id.name !== name || !d.init) continue;
      let node: t.Node | null = bare(d.init);
      for (const key of keys) node = node?.type === "ObjectExpression" ? property(node, key) : null;
      return node?.type === "ArrayExpression" ? node : null;
    }
  }
  return null;
}

/**
 * The entries of `section` written in `source`, at `home`: for a path, the
 * array there; otherwise every array of that name in the module, one after
 * another.
 */
export function entriesIn(source: string, home: Home, section: Section): Located[] {
  const file = parse(source, { sourceType: "module", plugins: ["typescript"] });
  if (home.path === null) return arraysNamed(file, section).flatMap((array) => entriesOf(array, source));
  const array = arrayAt(file, home.path);
  return array ? entriesOf(array, source) : [];
}

/** Located entries as the editor is shown them. */
export function listing(entries: readonly Located[]): Entry[] {
  return entries.map((e) => ({ title: e.title?.value ?? null, text: e.text?.value ?? null }));
}

const CONTROL: Record<string, string> = { "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f", "\v": "\\v" };

/** `value` written as a string literal in `quote`, which reads back as exactly `value`. */
export function encode(value: string, quote: Quote): string {
  let body = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    const code = ch.charCodeAt(0);
    if (ch === "\\" || ch === quote) body += "\\" + ch;
    else if (quote === "`" && ch === "$" && value[i + 1] === "{") body += "\\$";
    else if (ch in CONTROL) body += CONTROL[ch];
    else if (code < 0x20 || code === 0x7f || code === 0x2028 || code === 0x2029) {
      body += "\\u" + code.toString(16).padStart(4, "0");
    } else body += ch;
  }
  return quote + body + quote;
}

export type Rewrite = { ok: true; source: string; changed: boolean } | { ok: false; error: string };

const sameEntry = (e: Located, was: Entry): boolean =>
  (e.title?.value ?? null) === was.title && (e.text?.value ?? null) === was.text;

const NAMES: Record<Section, string> = { steps: "step", likes: "likeness", uses: "use" };

/** What the editor calls an entry, as "step 3". */
export const entryName = (section: Section, index: number): string => `${NAMES[section]} ${index + 1}`;

/**
 * `source` with one entry's fields replaced, keeping their quotes. The entry
 * is found by what the editor was shown (`was`), preferring its place in the
 * section when more than one entry reads the same; an edit to an entry that
 * has since changed, or to a field code builds, is refused.
 */
export function rewriteEntry(source: string, home: Home, edit: EntryEdit): Rewrite {
  const entries = entriesIn(source, home, edit.section);
  const matches = entries.flatMap((e, i) => (sameEntry(e, edit.was) ? [i] : []));
  const at = matches.includes(edit.index) ? edit.index : matches.length === 1 ? matches[0] : null;
  const name = entryName(edit.section, edit.index);
  if (at === null) {
    return {
      ok: false,
      error: matches.length === 0 ? `${cap(name)} has changed in the source since it was shown. Reload the page.` : `Several entries read as ${name} does; edit it by hand.`,
    };
  }
  const spans: { target: Literal; to: string }[] = [];
  for (const [field, to] of Object.entries(edit.to) as [Field, string][]) {
    const target = entries[at][field];
    if (!target) return { ok: false, error: `The ${field} of ${name} is built in code; edit it by hand.` };
    if (target.value !== to) spans.push({ target, to });
  }
  // From the end, so each span is still where it was found.
  let out = source;
  for (const { target, to } of spans.sort((a, b) => b.target.start - a.target.start)) {
    out = out.slice(0, target.start) + encode(to, target.quote) + out.slice(target.end);
  }
  return { ok: true, source: out, changed: spans.length > 0 };
}

/**
 * `source`, the file `file`, with every one of `edits` to it made, each on
 * the source the one before left; refused whole if any one is.
 */
export function rewriteFile(source: string, file: string, homes: Homes, edits: readonly EntryEdit[]): Rewrite {
  let out = source;
  let changed = false;
  for (const edit of edits) {
    const home = homes[edit.section];
    if (home.file !== file) continue;
    const result = rewriteEntry(out, home, edit);
    if (!result.ok) return result;
    out = result.source;
    changed ||= result.changed;
  }
  return { ok: true, source: out, changed };
}

const cap = (text: string): string => text[0].toUpperCase() + text.slice(1);
