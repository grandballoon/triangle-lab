// Finding a lesson's steps in its source and rewriting one step's text there,
// for the step editor, on the dev server (tools/step-editor-plugin.ts) and on
// staging (worker/staging.ts). Pure: source text in, source text out; the
// callers do the reading and writing.
//
// A standalone page's steps are its entry in `directions` (src/directions.ts);
// a lab lesson's are the `steps` array of its module (src/lab/lessons). Either
// way a step is an object literal, and a field the editor can change is one
// written as a plain string literal. The source is parsed (Babel's parser,
// small enough for a Worker) rather than matched with patterns, so comments,
// other strings and formatting never confuse it, and a rewrite touches only
// the literal's span.

import { parse } from "@babel/parser";
import type * as t from "@babel/types";
import type { Field, SourceStep, StepEdit } from "./wire.ts";

export const DIRECTIONS_FILE = "src/directions.ts";

/** Where a page's steps are written: the file, and for directions, the page's key in it. */
export interface StepHome {
  file: string;
  /** The key in `directions`; null for a lab lesson, whose whole module is its own. */
  key: string | null;
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Pages with no steps of their own. */
const NOT_LESSONS = new Set(["index", "recall"]);

/** The file holding the steps of `page` (path and query), or null for a page without any. */
export function homeOf(page: string): StepHome | null {
  let url: URL;
  try {
    url = new URL(page, "http://dev");
  } catch {
    return null;
  }
  const name = (url.pathname.split("/").pop() ?? "").replace(/\.html$/, "");
  if (name === "lab") {
    const slug = url.searchParams.get("lesson") ?? "";
    return SLUG.test(slug) ? { file: `src/lab/lessons/${slug}.ts`, key: null } : null;
  }
  return SLUG.test(name) && !NOT_LESSONS.has(name) ? { file: DIRECTIONS_FILE, key: name } : null;
}

type Quote = '"' | "'" | "`";

/** A plain string literal in the source: its span, quote and value. */
export interface Literal {
  start: number;
  end: number;
  quote: Quote;
  value: string;
}

/** One step object of the source, with each field that is a plain literal. */
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

/** The steps of one array literal, in order; an element that is not an object literal has no fields. */
function stepsOf(array: t.ArrayExpression, source: string): Located[] {
  return array.elements.map((element) => {
    const object = element && bare(element);
    if (object?.type !== "ObjectExpression") return { title: null, text: null };
    return { title: literal(property(object, "title"), source), text: literal(property(object, "text"), source) };
  });
}

const isNode = (v: unknown): v is t.Node => typeof v === "object" && v !== null && typeof (v as t.Node).type === "string";
/** Keys of a node that hold no children. */
const NOT_CHILDREN = new Set(["loc", "extra", "leadingComments", "trailingComments", "innerComments"]);

/** Every array literal assigned to a property `steps`, in source order. */
function stepArrays(file: t.File): t.ArrayExpression[] {
  const found: t.ArrayExpression[] = [];
  const visit = (node: t.Node): void => {
    if (node.type === "ObjectProperty" && !node.computed && nameOf(node.key) === "steps") {
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

/** The array literal of `key` in the `directions` object. */
function directionsArray(file: t.File, key: string): t.ArrayExpression | null {
  for (let statement of file.program.body) {
    if (statement.type === "ExportNamedDeclaration" && statement.declaration) statement = statement.declaration;
    if (statement.type !== "VariableDeclaration") continue;
    for (const d of statement.declarations) {
      if (d.id.type !== "Identifier" || d.id.name !== "directions" || !d.init) continue;
      const object = bare(d.init);
      if (object.type !== "ObjectExpression") return null;
      const value = property(object, key);
      return value?.type === "ArrayExpression" ? value : null;
    }
  }
  return null;
}

/**
 * The steps written in `source`: for a key, its directions; otherwise every
 * `steps` array in the module, one after another.
 */
export function stepsIn(source: string, key: string | null): Located[] {
  const file = parse(source, { sourceType: "module", plugins: ["typescript"] });
  if (key === null) return stepArrays(file).flatMap((array) => stepsOf(array, source));
  const array = directionsArray(file, key);
  return array ? stepsOf(array, source) : [];
}

/** Located steps as the editor is shown them. */
export function listing(steps: readonly Located[]): SourceStep[] {
  return steps.map((s) => ({ title: s.title?.value ?? null, text: s.text?.value ?? null }));
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

const sameStep = (s: Located, was: SourceStep): boolean =>
  (s.title?.value ?? null) === was.title && (s.text?.value ?? null) === was.text;

/**
 * `source` with one step's field replaced, keeping its quote. The step is
 * found by what the editor was shown (`was`), preferring its place in the
 * list when more than one step reads the same; an edit to a step that has
 * since changed, or to a field code builds, is refused.
 */
export function rewriteStep(source: string, key: string | null, edit: StepEdit): Rewrite {
  const steps = stepsIn(source, key);
  const matches = steps.flatMap((s, i) => (sameStep(s, edit.was) ? [i] : []));
  const at = matches.includes(edit.step) ? edit.step : matches.length === 1 ? matches[0] : null;
  if (at === null) {
    return {
      ok: false,
      error: matches.length === 0 ? "This step has changed in the source since it was shown. Reload the page." : "Several steps read the same; edit this one by hand.",
    };
  }
  const target = steps[at][edit.field];
  if (!target) return { ok: false, error: `This step's ${edit.field} is built in code; edit it by hand.` };
  if (target.value === edit.to) return { ok: true, source, changed: false };
  const written = encode(edit.to, target.quote);
  return { ok: true, source: source.slice(0, target.start) + written + source.slice(target.end), changed: true };
}
