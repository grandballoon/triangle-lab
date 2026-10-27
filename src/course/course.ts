// The course as text: every lesson in reading order, with its chapter and
// the title and text of each step. It is what the recall material (key facts
// and reference answers, src/recall/material.ts) is written from, by the
// Worker, which cannot load the lessons themselves, and shown beside, by the
// admin page.
//
// The text is read once from the lessons and kept in catalogue.generated.ts,
// which course.test.ts writes and keeps current: a test run fails while it
// is out of date, and `npx vitest run src/course -u` writes it afresh.

import { catalogue } from "./catalogue.generated.ts";

export interface CourseStep {
  title: string;
  /** May hold `$…$` LaTeX. */
  text: string;
}

export interface CourseLesson {
  slug: string;
  chapter: string;
  name: string;
  steps: CourseStep[];
}

export const course: readonly CourseLesson[] = catalogue;

/** The lesson `slug`, or null if it is not in the course. */
export function courseLesson(slug: string): CourseLesson | null {
  return course.find((l) => l.slug === slug) ?? null;
}

/** Step `step` of lesson `slug`, counted from 0, or null if there is none. */
export function courseStep(slug: string, step: number): CourseStep | null {
  return courseLesson(slug)?.steps[step] ?? null;
}

/** "Triangles · Medians · Step 2: Find the centroid": where a step is in the course. */
export function stepPlace(lesson: CourseLesson, step: number): string {
  const title = lesson.steps[step]?.title;
  return `${lesson.chapter} · ${lesson.name} · Step ${step + 1}${title ? `: ${title}` : ""}`;
}
