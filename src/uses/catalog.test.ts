// Every lesson's uses, gathered as the gallery gathers them (page.ts), held
// to what the gallery and the Uses tab need: each use has a picture, and each
// field the lessons promise examples from has enough of them to make a list
// worth reading. Each lesson's own uses are checked, tags and all, with the
// lesson (lab/lessons.test.ts, pages.test.ts).

import { describe, expect, it } from "vitest";
import { asides } from "../asides.ts";
import { Scene, type LessonBuilder, type Use } from "../lab/scene.ts";
import { chapters, lessons } from "../lessons.ts";
import { byTopic, placeAll, type Topic } from "./topics.ts";

const modules = import.meta.glob<{ default: LessonBuilder }>("../lab/lessons/*.ts", { eager: true });

const usesOf = (slug: string): readonly Use[] | undefined => {
  const lesson = lessons.find((l) => l.slug === slug);
  if (!lesson) return undefined;
  if (!lesson.lab) return asides[slug]?.uses;
  return modules[`../lab/lessons/${slug}.ts`]?.default(new Scene(lesson.accent)).uses;
};

const placed = placeAll(chapters, usesOf);

/** The fields the lessons promise examples from, and the fewest each should have. */
const FIELDS: Topic[] = ["music", "carpentry", "electrical", "plumbing", "fiber-arts", "gardening", "nature", "game-design", "astronomy"];
const AT_LEAST = 5;

describe("every lesson's uses", () => {
  it("are found for every lesson", () => {
    expect(lessons.filter((l) => !usesOf(l.slug)?.length).map((l) => l.slug)).toEqual([]);
  });

  it("each show a picture, which the gallery is made of", () => {
    expect(placed.filter((p) => !p.use.image).map((p) => `${p.slug}: ${p.use.title}`)).toEqual([]);
  });

  it.each(FIELDS)("give at least a few examples from %s", (field) => {
    const group = byTopic(placed).find((g) => g.topic.id === field);
    expect(group?.uses.length ?? 0).toBeGreaterThanOrEqual(AT_LEAST);
  });

  it("are each told once, never the same title twice in one lesson", () => {
    const seen = new Set<string>();
    const twice = placed.filter((p) => {
      const key = `${p.slug}: ${p.use.title}`;
      const again = seen.has(key);
      seen.add(key);
      return again;
    });
    expect(twice.map((p) => `${p.slug}: ${p.use.title}`)).toEqual([]);
  });
});
