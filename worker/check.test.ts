// What the Worker asks Claude when checking an answer, and how it reads the reply.

import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { checkParams, claudeFailed, MODEL, usageLine, verdictOf } from "./check.ts";

const request = { question: "Where do the medians meet?", where: "Triangles · Medians · Step 2", answer: "At the centroid" };

/** A reply from Claude, with only what verdictOf reads filled in. */
const message = (stop_reason: string, text: string): Anthropic.Beta.Messages.BetaMessage =>
  ({ stop_reason, content: [{ type: "thinking", thinking: "" }, { type: "text", text }] }) as never;

describe("checkParams", () => {
  it("asks for a verdict to a schema, about the learner's text in tags", () => {
    const params = checkParams(request);
    expect(params).toMatchObject({ model: MODEL, fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });
    expect(params.output_config?.format?.schema).toMatchObject({ required: ["grade", "feedback", "remarks"], additionalProperties: false });
    expect(params.messages).toEqual([
      {
        role: "user",
        content:
          "<question>Where do the medians meet?</question>\n<asked_in>Triangles · Medians · Step 2</asked_in>\n<answer>At the centroid</answer>",
      },
    ]);
  });
});

describe("verdictOf", () => {
  it("reads the verdict from Claude's structured reply", () => {
    expect(verdictOf(message("end_turn", '{"grade":"recalled","feedback":"Yes: the centroid."}'))).toEqual({
      grade: "recalled",
      feedback: "Yes: the centroid.",
    });
    const remarked = '{"grade":"missed","feedback":"No.","remarks":[{"quote":"incentre","note":"The centroid."}]}';
    expect(verdictOf(message("end_turn", remarked))).toEqual({
      grade: "missed",
      feedback: "No.",
      remarks: [{ quote: "incentre", note: "The centroid." }],
    });
  });

  it("fails when Claude declined, was cut short, or wrote something else", () => {
    expect(verdictOf(message("refusal", ""))).toMatchObject({ kind: "refuse", status: 502, error: expect.stringContaining("declined") });
    expect(verdictOf(message("max_tokens", '{"grade":'))).toMatchObject({ error: expect.stringContaining("cut short") });
    expect(verdictOf(message("end_turn", "not json"))).toMatchObject({ error: expect.stringContaining("unreadable") });
    expect(verdictOf(message("end_turn", '{"grade":"great","feedback":"!"}'))).toMatchObject({ status: 502 });
  });
});

describe("usageLine", () => {
  it("says which route used how many tokens, cached and not, on which model and effort", () => {
    const reply = {
      model: "claude-opus-5-5",
      stop_reason: "end_turn",
      usage: { input_tokens: 3000, cache_creation_input_tokens: 0, cache_read_input_tokens: 20000, output_tokens: 6000 },
    } as never;
    expect(usageLine("associate", "medium", reply)).toEqual({
      claude_usage: "associate",
      model: "claude-opus-5-5",
      effort: "medium",
      stop: "end_turn",
      input: 3000,
      cache_write: 0,
      cache_read: 20000,
      output: 6000,
    });
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
