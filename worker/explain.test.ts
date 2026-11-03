// What the Worker asks Claude when checking an explanation written on a lesson page.

import { describe, expect, it } from "vitest";
import { MODEL } from "./check.ts";
import { explainParams, lessonBrief } from "./explain.ts";

const described = { medians: { source: "x", teaches: ["The three medians meet at the centroid."], builds_on: [] } };

describe("lessonBrief", () => {
  it("places the lesson in its chapter, and says what it teaches where the syllabus does", () => {
    const brief = lessonBrief("medians", described);
    expect(brief).toMatch(/· Medians \(.+\)\. /);
    expect(brief).toContain("It teaches:\n- The three medians meet at the centroid.");
    expect(lessonBrief("medians", {})).not.toContain("It teaches");
  });
});

describe("explainParams", () => {
  it("asks for a verdict to a schema, about the lesson, the step and the explanation in tags", () => {
    const params = explainParams({ lesson: "medians", step: "Step 2: Find the centroid", text: "They meet." }, described);
    expect(params).toMatchObject({ model: MODEL, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(params.output_config?.format?.schema).toMatchObject({ required: ["grade", "feedback", "remarks"] });
    const [{ content }] = params.messages;
    expect(content).toBe(
      `<lesson>\n${lessonBrief("medians", described)}\n</lesson>\n<step>Step 2: Find the centroid</step>\n<explanation>\nThey meet.\n</explanation>`,
    );
  });
});
