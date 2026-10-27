// The material Claude grades answers against, beside the deck: a key fact
// for each lesson step, the one idea the step teaches, and a reference
// answer for each question in the deck, the answer the course would give.
// Both are written by Claude, in the house style, and can be read, edited,
// refined by instruction and restored from their history on the admin page
// (src/admin). Checking an answer (check.ts) writes any its card is missing.
//
// Each piece is an `Item`: every version of its text, oldest first, and the
// basis the current one was written for, the step's text or the question. A
// basis that has changed since (the lesson was rewritten, the question
// reworded) makes the item stale, to be written again.
//
// Pure, and shared by the Worker, which holds the material (worker/index.ts
// `Material`), and the admin page, so both read it by the same rules.

import type { CourseStep } from "../course/course.ts";
import type { Card } from "./deck.ts";

/** How a version came to be. */
export type Origin = "written" | "refined" | "edited" | "restored";

const ORIGINS: readonly Origin[] = ["written", "refined", "edited", "restored"];

export interface Version {
  /** May hold `$…$` LaTeX. */
  text: string;
  at: number;
  origin: Origin;
  /** What Claude was asked to change, for a refined version. */
  instruction?: string;
  /** When the version it brings back was made, for a restored version. */
  from?: number;
}

export interface Item {
  /** What the current version was written for: see `factBasis`, `referenceBasis`. */
  basis: string;
  /** Oldest first, and never empty: the last is current. */
  versions: Version[];
}

/** A piece of the material. */
export type Target =
  | { kind: "style" }
  | { kind: "fact"; lesson: string; step: number }
  | { kind: "reference"; card: string };

/** What Claude can write: a key fact or a reference answer, never the house style. */
export type Written = Exclude<Target, { kind: "style" }>;

/** What the admin page asks the Worker to do to a piece of the material. */
export type Command =
  | { kind: "write"; target: Written }
  | { kind: "refine"; target: Written; instruction: string }
  | { kind: "edit"; target: Target; text: string }
  | { kind: "restore"; target: Target; at: number };

/** Whether an item is there, and written for what it is now about. */
export type Standing = "missing" | "stale" | "current";

/** What the Worker answers the admin page's GET with. */
export interface MaterialView {
  /** Every item held, by `targetKey`. */
  items: Record<string, Item>;
  /** The deck's questions, which reference answers are written for. */
  cards: Pick<Card, "id" | "question" | "lesson" | "step" | "stepTitle">[];
}

/** Longest key fact or reference answer kept. */
export const MAX_TEXT = 2000;
export const MAX_STYLE = 4000;
export const MAX_INSTRUCTION = 1000;

/** How many versions of an item are kept; older ones are let go. */
export const MAX_VERSIONS = 50;

/**
 * How Claude writes key facts and reference answers until the house style is
 * edited on the admin page. Every rule here is one a reader of the course
 * would notice broken.
 */
export const DEFAULT_STYLE = `Write as a good teacher writes on the board: exact, plain and brief.

- Lead with the point. The first sentence states the fact, or answers the question, and makes sense on its own.
- Say each thing once. No preamble, no restating the question, no summary at the end.
- Use the precise term, and the course's own: its names for things, its spelling, and the figure's letters and symbols where the question uses them.
- Give a reason only where the question asks why or how, or where the fact is the reason. Then give the one the course gives, in a sentence.
- State things as true, without hedging or filler: no "note that", "basically", "it is important to remember".
- Write mathematics in LaTeX between single dollar signs, as in $a^2 + b^2 = c^2$, and never use a dollar sign otherwise. Keep symbols inside the dollar signs and words outside them.`;

/** Where an item is kept: "style", "fact:medians/1", "reference:<card id>". */
export function targetKey(target: Target): string {
  switch (target.kind) {
    case "style":
      return "style";
    case "fact":
      return `fact:${target.lesson}/${target.step}`;
    case "reference":
      return `reference:${target.card}`;
  }
}

/** What a key fact is written for: its step's title and text. */
export const factBasis = (step: CourseStep): string => `${step.title}\n${step.text}`;

/** What a reference answer is written for: its card's question. */
export const referenceBasis = (question: string): string => question;

/** The house style has nothing it is written for, so it is never stale. */
export const STYLE_BASIS = "";

/** The current text of an item. */
export const current = (item: Item): string => item.versions[item.versions.length - 1]!.text;

/** The house style Claude follows: the one edited on the admin page, or the default. */
export const styleText = (item: Item | undefined): string => (item ? current(item) : DEFAULT_STYLE);

export function standing(item: Item | undefined, basis: string): Standing {
  if (!item) return "missing";
  return item.basis === basis ? "current" : "stale";
}

/** `item` with `version` made current, written for `basis`. */
export function withVersion(item: Item | undefined, basis: string, version: Version): Item {
  return { basis, versions: [...(item?.versions ?? []), version].slice(-MAX_VERSIONS) };
}

/**
 * `item` with `version` made current, unless it became current for `basis`
 * while `version` was being written, as when two checks of one card write
 * its reference at once: the first to arrive is kept.
 */
export function settle(item: Item | undefined, basis: string, version: Version): Item {
  return item && standing(item, basis) === "current" ? item : withVersion(item, basis, version);
}

/**
 * The version a command makes, from the item it changes, or null when there
 * is nothing to refine or restore. `written` is Claude's text, for a
 * command Claude writes (`byClaude`).
 */
export function versionFor(command: Command, item: Item | undefined, now: number, written = ""): Version | null {
  switch (command.kind) {
    case "write":
      return { text: written, at: now, origin: "written" };
    case "refine":
      return item ? { text: written, at: now, origin: "refined", instruction: command.instruction } : null;
    case "edit":
      return { text: command.text, at: now, origin: "edited" };
    case "restore": {
      const old = item?.versions.find((v) => v.at === command.at);
      return old ? { text: old.text, at: now, origin: "restored", from: old.at } : null;
    }
  }
}

/** Whether a command needs Claude to write its text. */
export const byClaude = (command: Command): command is Extract<Command, { kind: "write" | "refine" }> =>
  command.kind === "write" || command.kind === "refine";

/** The longest text a piece of the material may hold. */
export const maxText = (target: Target): number => (target.kind === "style" ? MAX_STYLE : MAX_TEXT);

// --- Reading -------------------------------------------------------------------

/** Read a command, or null if `raw` is not one. Text is trimmed and must not be empty or too long. */
export function readCommand(raw: unknown): Command | null {
  if (!isObject(raw)) return null;
  const target = readTarget(raw.target);
  if (!target) return null;
  switch (raw.kind) {
    case "write":
      return target.kind === "style" ? null : { kind: "write", target };
    case "refine": {
      const instruction = text(raw.instruction, MAX_INSTRUCTION);
      return target.kind === "style" || !instruction ? null : { kind: "refine", target, instruction };
    }
    case "edit": {
      const edited = text(raw.text, maxText(target));
      return edited ? { kind: "edit", target, text: edited } : null;
    }
    case "restore":
      return isTime(raw.at) ? { kind: "restore", target, at: raw.at } : null;
    default:
      return null;
  }
}

export function readTarget(raw: unknown): Target | null {
  if (!isObject(raw)) return null;
  if (raw.kind === "style") return { kind: "style" };
  if (raw.kind === "fact" && typeof raw.lesson === "string" && raw.lesson && isStep(raw.step)) {
    return { kind: "fact", lesson: raw.lesson, step: raw.step };
  }
  if (raw.kind === "reference" && typeof raw.card === "string" && raw.card) return { kind: "reference", card: raw.card };
  return null;
}

/** Read an item, or null if `raw` is not one. */
export function readItem(raw: unknown): Item | null {
  if (!isObject(raw) || typeof raw.basis !== "string" || !Array.isArray(raw.versions)) return null;
  const versions = raw.versions.map(readVersion).filter((v): v is Version => v !== null);
  return versions.length > 0 ? { basis: raw.basis, versions } : null;
}

/** Read the Worker's view of the material, or null if `raw` is not one. Items and cards that make no sense are dropped. */
export function readMaterialView(raw: unknown): MaterialView | null {
  if (!isObject(raw) || !isObject(raw.items) || !Array.isArray(raw.cards)) return null;
  const items: Record<string, Item> = {};
  for (const [key, value] of Object.entries(raw.items)) {
    const item = readItem(value);
    if (item) items[key] = item;
  }
  const cards = raw.cards.flatMap((c) =>
    isObject(c) && typeof c.id === "string" && typeof c.question === "string" && typeof c.lesson === "string" && isStep(c.step)
      ? [{ id: c.id, question: c.question, lesson: c.lesson, step: c.step, stepTitle: typeof c.stepTitle === "string" ? c.stepTitle : "" }]
      : [],
  );
  return { items, cards };
}

function readVersion(raw: unknown): Version | null {
  if (!isObject(raw) || typeof raw.text !== "string" || !raw.text || !isTime(raw.at)) return null;
  if (!ORIGINS.includes(raw.origin as Origin)) return null;
  const version: Version = { text: raw.text, at: raw.at, origin: raw.origin as Origin };
  if (typeof raw.instruction === "string") version.instruction = raw.instruction;
  if (isTime(raw.from)) version.from = raw.from;
  return version;
}

/** `raw` trimmed, or "" if it is not text or is longer than `max`. */
function text(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  return trimmed.length <= max ? trimmed : "";
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

const isStep = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
