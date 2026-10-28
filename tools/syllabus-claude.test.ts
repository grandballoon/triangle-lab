// What the syllabus refresh asks the Claude API, and how it reads the reply.

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { lessons } from "../src/lessons.ts";
import { entryParams, MODEL, writtenOf } from "./syllabus-claude.ts";

const files = [{ path: "src/lab/lessons/medians.ts", text: 'steps: [{ title: "Find the centroid" }]' }];

/** A reply from Claude, with only what writtenOf reads filled in. */
const message = (stop_reason: string, text: string): Anthropic.Beta.Messages.BetaMessage =>
  ({ stop_reason, content: [{ type: "thinking", thinking: "" }, { type: "text", text }] }) as never;

describe("entryParams", () => {
  it("asks for an entry to a schema of the course's slugs, from the lesson's files in tags", () => {
    const params = entryParams("THE GUIDE", "THE OUTLINE", "medians", files);
    expect(params).toMatchObject({ model: MODEL, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    const schema = params.output_config?.format?.schema as Record<string, any>;
    expect(schema).toMatchObject({ required: ["teaches", "builds_on"], additionalProperties: false });
    expect(schema.properties.builds_on.items.enum).toEqual(lessons.map((l) => l.slug));
    expect(params.messages).toEqual([
      {
        role: "user",
        content: '<lesson slug="medians">\n<file path="src/lab/lessons/medians.ts">\nsteps: [{ title: "Find the centroid" }]\n</file>\n</lesson>',
      },
    ]);
  });

  it("shares one cached system prompt, the guide and the course, across every lesson in a run", () => {
    const [a] = entryParams("THE GUIDE", "THE OUTLINE", "medians", files).system as Anthropic.Beta.Messages.BetaTextBlockParam[];
    const [b] = entryParams("THE GUIDE", "THE OUTLINE", "bisectors", []).system as Anthropic.Beta.Messages.BetaTextBlockParam[];
    expect(a).toEqual(b);
    expect(a.text).toContain("<guide>\nTHE GUIDE\n</guide>");
    expect(a.text).toContain("<course>\nTHE OUTLINE\n</course>");
    expect(a.cache_control).toEqual({ type: "ephemeral" });
  });
});

describe("writtenOf", () => {
  it("reads the entry, trimmed, dropping the lesson itself and repeats from what it builds on", () => {
    const reply = { teaches: [" Medians meet at $G$. ", ""], builds_on: ["perimeter", "medians", "perimeter"] };
    expect(writtenOf(message("end_turn", JSON.stringify(reply)), "medians")).toEqual({ teaches: ["Medians meet at $G$."], builds_on: ["perimeter"] });
  });

  it("says why there is no entry", () => {
    expect(writtenOf(message("refusal", ""), "medians")).toEqual({ error: "Claude declined to describe medians." });
    expect(writtenOf(message("max_tokens", "{"), "medians")).toMatchObject({ error: expect.stringContaining("cut short") });
    expect(writtenOf(message("end_turn", "nope"), "medians")).toMatchObject({ error: expect.stringContaining("unreadable") });
    expect(writtenOf(message("end_turn", '{"teaches":[],"builds_on":[]}'), "medians")).toMatchObject({ error: expect.stringContaining("teaches nothing") });
  });
});
