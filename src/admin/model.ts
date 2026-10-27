// What the admin page (admin.html, page.ts) shows: the recall material
// (src/recall/material.ts) laid out as rows, a key fact for each step of
// each lesson and a reference answer for each question in the deck, with how
// each stands, and what the Worker's replies mean.
//
// Pure: page.ts renders these and does the I/O.

import { course, type CourseLesson, type CourseStep } from "../course/course.ts";
import {
  current,
  factBasis,
  readItem,
  readMaterialView,
  referenceBasis,
  standing,
  targetKey,
  type Item,
  type MaterialView,
  type Standing,
  type Target,
  type Version,
} from "../recall/material.ts";

/** One piece of the material as a row on the page. */
export interface Row {
  target: Exclude<Target, { kind: "style" }>;
  key: string;
  item: Item | undefined;
  standing: Standing;
}

export interface FactRow extends Row {
  /** The step, counted from 0, and what it says. */
  step: number;
  taught: CourseStep;
}

export interface ReferenceRow extends Row {
  card: MaterialView["cards"][number];
  /** The key fact of the step it was asked at, where there is one. */
  fact: string | null;
}

export interface LessonFacts {
  lesson: CourseLesson;
  rows: FactRow[];
}

/** Every step's key fact, lesson by lesson, in reading order. */
export function factRows(view: MaterialView): LessonFacts[] {
  return course.map((lesson) => ({
    lesson,
    rows: lesson.steps.map((taught, step) => {
      const target = { kind: "fact", lesson: lesson.slug, step } as const;
      const key = targetKey(target);
      const item = view.items[key];
      return { target, key, item, standing: standing(item, factBasis(taught)), step, taught };
    }),
  }));
}

/**
 * Every question's reference answer, grouped by lesson in reading order, and
 * in the order of their steps within one. Questions from a lesson no longer
 * in the course come last.
 */
export function referenceRows(view: MaterialView): { lesson: string; rows: ReferenceRow[] }[] {
  const rank = (slug: string): number => {
    const i = course.findIndex((l) => l.slug === slug);
    return i === -1 ? course.length : i;
  };
  const cards = [...view.cards].sort((a, b) => rank(a.lesson) - rank(b.lesson) || a.lesson.localeCompare(b.lesson) || a.step - b.step);
  const groups = new Map<string, ReferenceRow[]>();
  for (const card of cards) {
    const target = { kind: "reference", card: card.id } as const;
    const key = targetKey(target);
    const item = view.items[key];
    const fact = view.items[targetKey({ kind: "fact", lesson: card.lesson, step: card.step })];
    const row = { target, key, item, standing: standing(item, referenceBasis(card.question)), card, fact: fact ? current(fact) : null };
    groups.set(card.lesson, [...(groups.get(card.lesson) ?? []), row]);
  }
  return [...groups.entries()].map(([lesson, rows]) => ({ lesson, rows }));
}

/** How many rows stand each way. */
export function tally(rows: readonly Row[]): Record<Standing, number> {
  const counts: Record<Standing, number> = { missing: 0, stale: 0, current: 0 };
  for (const row of rows) counts[row.standing]++;
  return counts;
}

/** Whether a row wants writing: it is missing, or was written for something since changed. */
export const wanting = (row: Row): boolean => row.standing !== "current";

/** "3 of 5 written · 1 stale", for a lesson's heading. */
export function tallyLabel(rows: readonly Row[]): string {
  const { missing, stale } = tally(rows);
  const parts = [`${rows.length - missing} of ${rows.length} written`];
  if (stale > 0) parts.push(`${stale} stale`);
  return parts.join(" · ");
}

/** Why a row is stale, in its own terms. */
export function staleLabel(row: Row): string {
  return row.target.kind === "fact"
    ? "Written before this step's text changed."
    : "Written for an earlier wording of the question.";
}

/**
 * How a version came to be, for its history line: "Written by Claude",
 * "Refined: “Name the point.”", "Edited by you", "Restored from 26 Oct
 * 2026, 14:05".
 */
export function originLabel(version: Version, when: (at: number) => string): string {
  switch (version.origin) {
    case "written":
      return "Written by Claude";
    case "refined":
      return `Refined: “${version.instruction ?? ""}”`;
    case "edited":
      return "Edited by you";
    case "restored":
      return version.from === undefined ? "Restored" : `Restored from ${when(version.from)}`;
  }
}

// --- The Worker's replies -------------------------------------------------------

/** What came of a request to the Worker: what was asked for, or why not. */
export type Reply<T> = { kind: "ok"; value: T } | { kind: "refused" } | { kind: "failed"; error: string };

/** What a reply to GET /material means: its status and body, or null for none, as when offline. */
export function readViewReply(answer: { status: number; body: unknown } | null): Reply<MaterialView> {
  return readReply(answer, readMaterialView, "The material came back unreadable.");
}

/** What a reply to a command means. */
export function readItemReply(answer: { status: number; body: unknown } | null): Reply<Item> {
  return readReply(answer, readItem, "The change came back unreadable.");
}

function readReply<T>(answer: { status: number; body: unknown } | null, read: (raw: unknown) => T | null, unreadable: string): Reply<T> {
  if (!answer) return { kind: "failed", error: "Can't reach the server." };
  const { status, body } = answer;
  if (status === 401) return { kind: "refused" };
  if (status >= 200 && status < 300) {
    const value = read(body);
    return value ? { kind: "ok", value } : { kind: "failed", error: unreadable };
  }
  const said = typeof body === "object" && body !== null && typeof (body as { error?: unknown }).error === "string" ? (body as { error: string }).error : "";
  return { kind: "failed", error: said || `The server answered ${status}.` };
}
