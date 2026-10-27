// What the Worker asks Claude when it writes or refines a key fact or a
// reference answer, and how it reads the reply.

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import type { CourseLesson } from "../src/course/course.ts";
import { MAX_TEXT } from "../src/recall/material.ts";
import { MODEL } from "./check.ts";
import { refineParams, whereOf, writeParams, writtenOf, type ReferenceContext } from "./material.ts";

const lesson: CourseLesson = {
  slug: "medians",
  chapter: "Triangles",
  name: "Medians",
  steps: [
    { title: "Pull a median", text: "Drag each knob to the midpoint of the opposite side." },
    { title: 'The "centroid"', text: "The three medians meet at $G$." },
  ],
};

const reference: ReferenceContext = {
  kind: "reference",
  question: "Where do the medians meet?",
  where: "Triangles · Medians · Step 2: The centroid",
  lesson,
  step: 1,
  fact: "The three medians of a triangle meet at one point, the centroid.",
};

const userText = (params: ReturnType<typeof writeParams>): string => params.messages[0].content as string;

/** A reply from Claude, with only what writtenOf reads filled in. */
const message = (stop_reason: string, text: string): Anthropic.Beta.Messages.BetaMessage =>
  ({ stop_reason, content: [{ type: "thinking", thinking: "" }, { type: "text", text }] }) as never;

describe("writeParams", () => {
  it("asks for a key fact from the whole lesson, in the house style, as text to a schema", () => {
    const params = writeParams({ kind: "fact", lesson, step: 1 }, "Be brief.");
    expect(params).toMatchObject({ model: MODEL, fallbacks: "default", output_config: { effort: "high" } });
    expect(params.output_config?.format?.schema).toMatchObject({ required: ["text"], additionalProperties: false });
    expect(params.system).toContain("key facts");
    expect(params.system).toContain("<house_style>\nBe brief.\n</house_style>");
    expect(userText(params)).toBe(
      [
        '<lesson chapter="Triangles" name="Medians">',
        '<step number="1" title="Pull a median">\nDrag each knob to the midpoint of the opposite side.\n</step>',
        '<step number="2" title="The &quot;centroid&quot;">\nThe three medians meet at $G$.\n</step>',
        "</lesson>",
        "",
        'Write the key fact for step 2, "The "centroid"".',
      ].join("\n"),
    );
  });

  it("asks for a reference answer with the step asked at marked, its key fact and the question", () => {
    const params = writeParams(reference, "Be brief.");
    expect(params.system).toContain("reference answers");
    const text = userText(params);
    expect(text).toContain('<step number="2" title="The &quot;centroid&quot;" asked_here="true">');
    expect(text).toContain('<step number="1" title="Pull a median">');
    expect(text).toContain("<key_fact>\nThe three medians of a triangle meet at one point, the centroid.\n</key_fact>");
    expect(text.endsWith("<question>\nWhere do the medians meet?\n</question>\n\nWrite the reference answer to the question.")).toBe(true);
  });

  it("says where a question was asked when its lesson has left the course, and gives no key fact it lacks", () => {
    const text = userText(writeParams({ ...reference, lesson: null, fact: null }, ""));
    expect(text).toContain("<asked_in>Triangles · Medians · Step 2: The centroid</asked_in>");
    expect(text).not.toContain("<lesson");
    expect(text).not.toContain("<key_fact>");
  });
});

describe("refineParams", () => {
  it("gives the current version and the instruction, and asks for nothing else to change", () => {
    const text = userText(refineParams(reference, "Be brief.", "At $G$.", "Name the point."));
    expect(text).toContain("<question>\nWhere do the medians meet?\n</question>");
    expect(text).toContain("<current_version>\nAt $G$.\n</current_version>\n\n<instruction>\nName the point.\n</instruction>");
    expect(text).toContain("Change nothing the instruction does not ask you to change");
  });
});

describe("whereOf", () => {
  it("says where a card was asked, from the course or from the card", () => {
    expect(whereOf({ lesson: "medians", step: 1, stepTitle: "Old title" }, lesson)).toBe(
      'Triangles · Medians · Step 2: The "centroid"',
    );
    expect(whereOf({ lesson: "gone", step: 0, stepTitle: "Old title" }, null)).toBe("gone · Step 1: Old title");
    expect(whereOf({ lesson: "gone", step: 2, stepTitle: "" }, null)).toBe("gone · Step 3");
  });
});

describe("writtenOf", () => {
  it("reads the text, trimmed", () => {
    expect(writtenOf(message("end_turn", '{"text":"  The centroid.  "}'))).toBe("The centroid.");
  });

  it("fails when Claude declined, was cut short, or wrote nothing usable", () => {
    expect(writtenOf(message("refusal", ""))).toMatchObject({ kind: "refuse", status: 502, error: expect.stringContaining("declined") });
    expect(writtenOf(message("max_tokens", '{"text":'))).toMatchObject({ error: expect.stringContaining("cut short") });
    for (const text of ["not json", '{"text":"  "}', '{"words":"x"}', JSON.stringify({ text: "x".repeat(MAX_TEXT + 1) })]) {
      expect(writtenOf(message("end_turn", text))).toMatchObject({ error: expect.stringContaining("unreadable") });
    }
  });
});
