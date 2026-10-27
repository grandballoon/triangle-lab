// What the Worker asks Claude when checking an answer, and how it reads the reply.

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { checkParams, claudeFailed, MODEL, verdictOf } from "./check.ts";

const request = { question: "Where do the medians meet?", where: "Triangles · Medians · Step 2", answer: "At the centroid" };

/** A reply from Claude, with only what verdictOf reads filled in. */
const message = (stop_reason: string, text: string): Anthropic.Beta.Messages.BetaMessage =>
  ({ stop_reason, content: [{ type: "thinking", thinking: "" }, { type: "text", text }] }) as never;

describe("checkParams", () => {
  it("asks for a verdict to a schema, about the learner's text in tags", () => {
    const params = checkParams(request);
    expect(params).toMatchObject({ model: MODEL, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(params.output_config?.format?.schema).toMatchObject({ required: ["grade", "feedback"], additionalProperties: false });
    expect(params.messages).toEqual([
      {
        role: "user",
        content:
          "<question>Where do the medians meet?</question>\n<asked_in>Triangles · Medians · Step 2</asked_in>\n<answer>At the centroid</answer>",
      },
    ]);
  });

  it("gives the key fact and the reference answer to grade against, where there are any", () => {
    const params = checkParams(request, { fact: "The medians meet at the centroid.", reference: "At the centroid, $G$." });
    expect(params.system).toContain("Grade against the reference answer");
    expect(params.messages[0].content).toBe(
      [
        "<question>Where do the medians meet?</question>",
        "<asked_in>Triangles · Medians · Step 2</asked_in>",
        "<key_fact>The medians meet at the centroid.</key_fact>",
        "<reference_answer>At the centroid, $G$.</reference_answer>",
        "<answer>At the centroid</answer>",
      ].join("\n"),
    );
    expect(checkParams(request, { fact: null, reference: "At $G$." }).messages[0].content).not.toContain("<key_fact>");
  });
});

describe("verdictOf", () => {
  it("reads the verdict from Claude's structured reply", () => {
    expect(verdictOf(message("end_turn", '{"grade":"recalled","feedback":"Yes: the centroid."}'))).toEqual({
      grade: "recalled",
      feedback: "Yes: the centroid.",
    });
  });

  it("fails when Claude declined, was cut short, or wrote something else", () => {
    expect(verdictOf(message("refusal", ""))).toMatchObject({ kind: "refuse", status: 502, error: expect.stringContaining("declined") });
    expect(verdictOf(message("max_tokens", '{"grade":'))).toMatchObject({ error: expect.stringContaining("cut short") });
    expect(verdictOf(message("end_turn", "not json"))).toMatchObject({ error: expect.stringContaining("unreadable") });
    expect(verdictOf(message("end_turn", '{"grade":"great","feedback":"!"}'))).toMatchObject({ status: 502 });
  });
});

describe("claudeFailed", () => {
  it("says why a call to Claude failed", () => {
    expect(claudeFailed(401).error).toContain("ANTHROPIC_API_KEY");
    expect(claudeFailed(429).error).toContain("busy");
    expect(claudeFailed(undefined).error).toBe("Couldn't reach Claude.");
    expect(claudeFailed(529)).toEqual({ kind: "refuse", status: 502, error: "Claude answered 529." });
  });
});
