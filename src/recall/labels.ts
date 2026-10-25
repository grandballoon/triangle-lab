// What the recall UI says about a card: where it was asked, when it is due,
// and its question typeset. Pure, shared by the capture sheet in a lesson
// (capture.ts) and the recall page (page.ts).

import { escapeHtml, richHtml } from "../lab/math.ts";
import { chapters, hrefOf, lessons } from "../lessons.ts";
import { DAY_MS, dueAfter, nextBox, type Card, type Grade, type Place } from "./deck.ts";

const HOUR_MS = 60 * 60 * 1000;

/** The lesson's name, or its slug if it has left the course. */
export function lessonName(slug: string): string {
  return lessons.find((l) => l.slug === slug)?.name ?? slug;
}

/** "Step 2: Find the centroid", or "Step 2" for a step with no title kept. */
export function stepLabel(place: Place): string {
  return place.stepTitle ? `Step ${place.step + 1}: ${place.stepTitle}` : `Step ${place.step + 1}`;
}

/** "Triangles · Medians", for a heading over a lesson's cards. */
export function lessonLabel(slug: string): string {
  const lesson = lessons.find((l) => l.slug === slug);
  const chapter = chapters.find((c) => lesson && c.lessons.includes(lesson));
  return chapter ? `${chapter.title} · ${lessonName(slug)}` : lessonName(slug);
}

/** Where to check an answer: the lesson, opened at the step it was asked. */
export function sourceHref(place: Place): string | null {
  const lesson = lessons.find((l) => l.slug === place.lesson);
  return lesson ? hrefOf(lesson, place.step) : null;
}

/** "due now", "in 5 hours", "tomorrow", "in 3 days", "in 5 weeks". */
export function whenLabel(due: number, now: number): string {
  const ms = due - now;
  if (ms <= 0) return "due now";
  if (ms < DAY_MS) return plural(Math.max(1, Math.round(ms / HOUR_MS)), "hour");
  const days = Math.round(ms / DAY_MS);
  if (days <= 1) return "tomorrow";
  return days < 14 ? plural(days, "day") : plural(Math.round(days / 7), "week");
}

/** When the card would come back if graded `grade` now: "again now", "tomorrow", "in 3 days". */
export function gradeHint(card: Card, grade: Grade, now: number): string {
  const due = dueAfter(nextBox(card.box, grade), now);
  return due <= now ? "again now" : whenLabel(due, now);
}

/**
 * Cards grouped by lesson, in reading order. Cards from a lesson no longer in
 * the course come last.
 */
export function byLesson(cards: readonly Card[]): { lesson: string; cards: Card[] }[] {
  const rank = (slug: string): number => {
    const i = lessons.findIndex((l) => l.slug === slug);
    return i === -1 ? lessons.length : i;
  };
  const groups = new Map<string, Card[]>();
  for (const card of cards) groups.set(card.lesson, [...(groups.get(card.lesson) ?? []), card]);
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([lesson, list]) => ({
      lesson,
      cards: list.sort((a, b) => a.step - b.step || a.created - b.created),
    }));
}

/**
 * A question as safe HTML, with `$…$` typeset as in the lessons. A question
 * whose dollar signs do not pair up (it mentions money) is shown as plain text.
 */
export function questionHtml(text: string): string {
  const dollars = text.split("$").length - 1;
  return dollars % 2 === 0 ? richHtml(text) : escapeHtml(text);
}

function plural(n: number, unit: string): string {
  return `in ${n} ${unit}${n === 1 ? "" : "s"}`;
}
