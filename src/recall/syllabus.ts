// What each lesson teaches and which lessons it builds on, so Claude can pick
// the shortest next steps from a free association (associate.ts) without
// working out the course from lesson names alone.
//
// The facts live in syllabus.json, written from each lesson's source by the
// /syllabus skill in Claude Code (.claude/skills/syllabus), or, for lessons
// that slipped past it, by the Claude API when the site is deployed
// (tools/syllabus.ts refresh). Either way the work is done once per lesson
// change, rather than on every reading. Each entry is stamped with a hash of
// the lesson's teaching text as it was read, so a lesson whose text has
// changed since shows as stale, and a test fails until it is written afresh.
//
// Pure: reading the file, what is wrong with it, what is stale, which
// lessons are within reach of the ones known, and the course as Claude is
// told it.

import { chapters, lessons } from "../lessons.ts";

/** What one lesson teaches, as the skill wrote it. */
export interface Entry {
  /** A hash of the lesson's source when the entry was written (tools/syllabus.ts). */
  source: string;
  /** The facts and skills the lesson establishes, each a short statement, with `$…$` for mathematics. */
  teaches: string[];
  /** Slugs of the lessons it builds on directly: the fewest whose content it needs. */
  builds_on: string[];
}

/** Every lesson written up so far, by slug. A lesson missing is simply not described yet. */
export type Syllabus = Record<string, Entry>;

/** The file as stored: a note for anyone opening it, and the entries in reading order. */
export interface SavedSyllabus {
  about: string;
  lessons: Syllabus;
}

export const ABOUT = "Written by the /syllabus skill in Claude Code (.claude/skills/syllabus/SKILL.md). Do not edit by hand: run /syllabus.";

/** Read a syllabus, keeping the entries that make sense. */
export function readSyllabus(raw: unknown): Syllabus {
  const entries = isObject(raw) && isObject(raw.lessons) ? raw.lessons : {};
  const syllabus: Syllabus = {};
  for (const [slug, entry] of Object.entries(entries)) {
    if (!isObject(entry) || typeof entry.source !== "string") continue;
    const teaches = strings(entry.teaches);
    if (teaches.length === 0) continue;
    syllabus[slug] = { source: entry.source, teaches, builds_on: strings(entry.builds_on) };
  }
  return syllabus;
}

/** The syllabus as stored: entries in reading order, each key in a fixed order, so a rewrite changes only what changed. */
export function saveSyllabus(syllabus: Syllabus): SavedSyllabus {
  const ordered: Syllabus = {};
  const rank = (slug: string): number => {
    const i = lessons.findIndex((l) => l.slug === slug);
    return i === -1 ? lessons.length : i;
  };
  for (const slug of Object.keys(syllabus).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))) {
    const { source, teaches, builds_on } = syllabus[slug];
    ordered[slug] = { source, teaches, builds_on };
  }
  return { about: ABOUT, lessons: ordered };
}

/**
 * What is wrong with a syllabus, as sentences: an entry for a lesson not in
 * the course, one that builds on an unknown lesson or on itself, nothing
 * taught, or lessons that build on each other round in a circle.
 */
export function problems(syllabus: Syllabus, slugs: readonly string[]): string[] {
  const known = new Set(slugs);
  const found: string[] = [];
  for (const [slug, entry] of Object.entries(syllabus)) {
    if (!known.has(slug)) found.push(`${slug} is not a lesson in the course.`);
    if (entry.teaches.length === 0) found.push(`${slug} teaches nothing.`);
    for (const before of entry.builds_on) {
      if (before === slug) found.push(`${slug} builds on itself.`);
      else if (!known.has(before)) found.push(`${slug} builds on ${before}, which is not a lesson in the course.`);
    }
  }
  const cycle = findCycle(syllabus);
  if (cycle) found.push(`These lessons build on each other in a circle: ${cycle.join(" → ")}.`);
  return found;
}

/** Lessons with no entry, or one written from a source that has changed since, in the order of `hashes`. */
export function stale(syllabus: Syllabus, hashes: ReadonlyMap<string, string>): { missing: string[]; changed: string[] } {
  const missing: string[] = [];
  const changed: string[] = [];
  for (const [slug, hash] of hashes) {
    const entry = syllabus[slug];
    if (!entry) missing.push(slug);
    else if (entry.source !== hash) changed.push(slug);
  }
  return { missing, changed };
}

/**
 * The lessons not in `known` whose groundwork is: every lesson they build on
 * is known, and they build on at least one, so a lesson that starts from
 * nothing is not counted as reached. In reading order.
 */
export function withinReach(syllabus: Syllabus, known: ReadonlySet<string>): string[] {
  return lessons
    .map((l) => l.slug)
    .filter((slug) => {
      const entry = syllabus[slug];
      return !known.has(slug) && !!entry && entry.builds_on.length > 0 && entry.builds_on.every((b) => known.has(b));
    });
}

/**
 * The course in reading order, chapter by chapter: each chapter with the
 * results it teaches, then its lessons, by slug, name, place and what the
 * learner does in it, with what each teaches and builds on where `described`
 * says.
 */
export function course(described: Syllabus): string {
  return chapters
    .map((chapter) => {
      const head = `## ${chapter.title}: ${chapter.blurb}\nResults taught: ${chapter.axioms.join("; ")}.`;
      const list = chapter.lessons.map((l) => {
        const entry = described[l.slug];
        const line = `- ${l.slug}: ${l.name} (${l.part}). ${l.desc}`;
        if (!entry) return line;
        const after = entry.builds_on.length > 0 ? entry.builds_on.join(", ") : "nothing";
        return `${line}\n  Teaches: ${entry.teaches.join(" ")}\n  Builds on: ${after}.`;
      });
      return [head, ...list].join("\n");
    })
    .join("\n\n");
}

/** A circle of lessons building on each other, as a path that ends where it began, or null if there is none. */
function findCycle(syllabus: Syllabus): string[] | null {
  const done = new Set<string>();
  const path: string[] = [];
  const visit = (slug: string): string[] | null => {
    const at = path.indexOf(slug);
    if (at !== -1) return [...path.slice(at), slug];
    if (done.has(slug)) return null;
    path.push(slug);
    for (const before of syllabus[slug]?.builds_on ?? []) {
      const cycle = before === slug ? null : visit(before);
      if (cycle) return cycle;
    }
    path.pop();
    done.add(slug);
    return null;
  };
  for (const slug of Object.keys(syllabus)) {
    const cycle = visit(slug);
    if (cycle) return cycle;
  }
  return null;
}

function strings(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string" && s.trim() !== "").map((s) => s.trim()) : [];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
