// What the recall UI says about a card, and the links that open a lesson at
// the step a question was asked.

import { describe, expect, it } from "vitest";
import { hrefOf, lessons, stepOfHash } from "../lessons.ts";
import { DAY_MS, newCard, type Card } from "./deck.ts";
import { byLesson, gradeHint, lessonLabel, questionHtml, sourceHref, stepLabel, whenLabel } from "./labels.ts";

const HOUR = 60 * 60 * 1000;
const T0 = 1_800_000_000_000;
const at = (lesson: string, step = 0, id = `${lesson}-${step}`, created = T0): Card =>
  newCard(id, "Why?", { lesson, step, stepTitle: "" }, created)!;

describe("step links", () => {
  const lab = lessons.find((l) => l.lab)!;
  const standalone = lessons.find((l) => !l.lab)!;

  it("open a lesson at a step, counted from 1 in the link", () => {
    expect(hrefOf(standalone, 2)).toBe(`${standalone.slug}.html#step-3`);
    expect(hrefOf(lab, 0)).toBe(`lab.html?lesson=${lab.slug}#step-1`);
    expect(hrefOf(lab)).toBe(`lab.html?lesson=${lab.slug}`);
  });

  it("are read back to the step they name", () => {
    expect(stepOfHash("#step-3")).toBe(2);
    for (const hash of ["", "#", "#step-0", "#step-", "#step-2x", "#steps-2", "#step--1"]) {
      expect(stepOfHash(hash)).toBeNull();
    }
  });

  it("lead from a card to its lesson and step", () => {
    expect(sourceHref({ lesson: "medians", step: 1, stepTitle: "" })).toBe("medians.html#step-2");
    expect(sourceHref({ lesson: "gone", step: 1, stepTitle: "" })).toBeNull();
  });
});

describe("labels", () => {
  it("name the step, with its title when one was kept", () => {
    expect(stepLabel({ lesson: "medians", step: 1, stepTitle: "Find the centroid" })).toBe("Step 2: Find the centroid");
    expect(stepLabel({ lesson: "medians", step: 1, stepTitle: "" })).toBe("Step 2");
  });

  it("name the lesson with its chapter, or by slug once it has left the course", () => {
    expect(lessonLabel("medians")).toBe("Triangles · Medians");
    expect(lessonLabel("gone")).toBe("gone");
  });

  it("say when a card is due", () => {
    expect(whenLabel(T0, T0)).toBe("due now");
    expect(whenLabel(T0 - DAY_MS, T0)).toBe("due now");
    expect(whenLabel(T0 + 10 * 60 * 1000, T0)).toBe("in 1 hour");
    expect(whenLabel(T0 + 5 * HOUR, T0)).toBe("in 5 hours");
    expect(whenLabel(T0 + DAY_MS - 6 * HOUR, T0)).toBe("in 18 hours");
    expect(whenLabel(T0 + DAY_MS, T0)).toBe("tomorrow");
    expect(whenLabel(T0 + 3 * DAY_MS - 6 * HOUR, T0)).toBe("in 3 days");
    expect(whenLabel(T0 + 35 * DAY_MS, T0)).toBe("in 5 weeks");
  });

  it("say when each grade would bring a card back", () => {
    const fresh = at("medians");
    expect(gradeHint(fresh, "missed", T0)).toBe("again now");
    expect(gradeHint(fresh, "shaky", T0)).toBe("in 18 hours");
    expect(gradeHint({ ...fresh, box: 2 }, "recalled", T0)).toBe("in 7 days");
  });
});

describe("byLesson", () => {
  it("groups cards by lesson in reading order, steps in order, unknown lessons last", () => {
    const groups = byLesson([at("gone"), at("medians", 2), at("angles"), at("medians", 0)]);
    expect(groups.map((g) => [g.lesson, g.cards.map((c) => c.step)])).toEqual([
      ["angles", [0]],
      ["medians", [0, 2]],
      ["gone", [0]],
    ]);
  });
});

describe("questionHtml", () => {
  it("escapes what the learner wrote", () => {
    expect(questionHtml("Is <b>a</b> & b?")).toBe("Is &lt;b&gt;a&lt;/b&gt; &amp; b?");
  });

  it("typesets $…$ as the lessons do", () => {
    expect(questionHtml("Why is $a^2+b^2=c^2$?")).toContain('class="katex"');
  });

  it("leaves a lone dollar sign as text", () => {
    expect(questionHtml("Is it $5 or <6?")).toBe("Is it $5 or &lt;6?");
  });
});
