// What the Worker asks Claude when reading a free association, and how it reads the reply.

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { lessons } from "../src/lessons.ts";
import { MODEL } from "./check.ts";
import { associateParams, readingOf, syllabus } from "./associate.ts";

const request = { text: "Medians meet at the incentre.", noted: ["medians", "pythagoras"] };

/** A reply from Claude, with only what readingOf reads filled in. */
const message = (stop_reason: string, text: string): Anthropic.Beta.Messages.BetaMessage =>
  ({ stop_reason, content: [{ type: "thinking", thinking: "" }, { type: "text", text }] }) as never;

describe("syllabus", () => {
  it("lists every lesson in the course by slug, with its chapter's results", () => {
    const text = syllabus();
    for (const lesson of lessons) expect(text).toContain(`- ${lesson.slug}: ${lesson.name} (`);
    expect(text).toContain("## Triangles");
    expect(text).toContain("Results taught: Classification by sides and angles; Centroid;");
  });
});

describe("associateParams", () => {
  it("asks for a reading to a schema, naming lessons only by their slugs, about the learner's writing in tags", () => {
    const params = associateParams(request);
    expect(params).toMatchObject({ model: MODEL, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    const schema = params.output_config?.format?.schema as Record<string, any>;
    expect(schema).toMatchObject({ required: ["remarks", "feedback", "next"], additionalProperties: false });
    const slugs = lessons.map((l) => l.slug);
    expect(schema.properties.next.items.properties.lesson.enum).toEqual(slugs);
    expect(schema.properties.remarks.items.properties.lesson.enum).toEqual(["", ...slugs]);
    expect(params.messages).toEqual([
      {
        role: "user",
        content: "<noted_lessons>\nmedians\npythagoras\n</noted_lessons>\n<writing>\nMedians meet at the incentre.\n</writing>",
      },
    ]);
  });

  it("gives Claude the course, cached, as the system prompt", () => {
    const [system] = associateParams(request).system as Anthropic.Beta.Messages.BetaTextBlockParam[];
    expect(system.text).toContain(syllabus());
    expect(system.cache_control).toEqual({ type: "ephemeral" });
  });

  it("says when no lessons have questions noted in them", () => {
    expect(JSON.stringify(associateParams({ ...request, noted: [] }).messages)).toContain("<noted_lessons>\\nnone yet\\n</noted_lessons>");
  });
});

describe("readingOf", () => {
  it("reads the reading from Claude's structured reply, dropping an empty lesson", () => {
    const reply = {
      remarks: [{ quote: "the incentre", note: "The centroid.", lesson: "medians" }, { quote: "Medians", note: "Fine.", lesson: "" }],
      feedback: "Good.",
      next: [{ lesson: "bisectors", why: "Next." }],
    };
    expect(readingOf(message("end_turn", JSON.stringify(reply)))).toEqual({
      remarks: [{ quote: "the incentre", note: "The centroid.", lesson: "medians" }, { quote: "Medians", note: "Fine." }],
      feedback: "Good.",
      next: [{ lesson: "bisectors", why: "Next." }],
    });
  });

  it("fails when Claude declined, was cut short, or wrote something else", () => {
    expect(readingOf(message("refusal", ""))).toMatchObject({ kind: "refuse", status: 502, error: expect.stringContaining("declined") });
    expect(readingOf(message("max_tokens", '{"feedback":'))).toMatchObject({ error: expect.stringContaining("cut short") });
    expect(readingOf(message("end_turn", "not json"))).toMatchObject({ error: expect.stringContaining("unreadable") });
    expect(readingOf(message("end_turn", '{"feedback":""}'))).toMatchObject({ status: 502 });
  });
});
