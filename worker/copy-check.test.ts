// The request to Claude to fact-check a lesson's copy, and what each kind of
// reply comes to.

import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import type { CheckRequest } from "../src/dev/copy/check.ts";
import { afterReply, askCopyCheck, copyCheckParams, COPY_CHECK_SCHEMA, MAX_RESUMES } from "./copy-check.ts";
import { MODEL } from "./check.ts";

type Message = Anthropic.Beta.Messages.BetaMessage;

const request: CheckRequest = {
  page: "/lab.html?lesson=slope",
  fields: [
    { id: "steps.0.title", text: "Rise" },
    { id: "uses.1.text", text: "Ramps rise $1$ in $12$." },
  ],
};

const reply = (content: Message["content"], stop_reason: Message["stop_reason"] = "end_turn"): Message =>
  ({ id: "msg", type: "message", role: "assistant", model: MODEL, content, stop_reason, stop_sequence: null, usage: {} }) as unknown as Message;

const text = (t: string) => ({ type: "text", text: t, citations: null }) as Message["content"][number];
const check = { summary: "One slip.", remarks: [{ field: "uses.1.text", quote: "$12$", note: "Fine.", fix: "" }] };

describe("copyCheckParams", () => {
  it("asks for a check of the lesson's copy, field by field, in the check's form, with the web to search", () => {
    const params = copyCheckParams(request)!;
    expect(params.model).toBe(MODEL);
    expect(params.output_config).toEqual({ effort: "high", format: { type: "json_schema", schema: COPY_CHECK_SCHEMA } });
    expect(params.tools).toEqual([{ type: "web_search_20260209", name: "web_search", max_uses: 8 }]);
    const content = params.messages[0].content as string;
    expect(content).toMatch(/^<lesson>\n[\s\S]+\n<\/lesson>\n<copy>\n/);
    expect(content).toContain('<field id="steps.0.title" name="steps.0.title (step 1, title)">\nRise\n</field>');
    expect(content).toContain('<field id="uses.1.text" name="uses.1.text (use 2, text)">\nRamps rise $1$ in $12$.\n</field>');
  });

  it("asks nothing for a page that shows no lesson", () => {
    expect(copyCheckParams({ ...request, page: "/recall.html" })).toBeNull();
  });
});

describe("afterReply", () => {
  const params = copyCheckParams(request)!;

  it("reads the check from the reply's text, after any searching", () => {
    const search = { type: "server_tool_use", id: "s", name: "web_search", input: { query: "ramp" } } as unknown as Message["content"][number];
    expect(afterReply(request, params, reply([text(JSON.stringify(check))]), 0)).toEqual({ kind: "done", check });
    expect(afterReply(request, params, reply([text("Let me search."), search, text(JSON.stringify(check))]), 0)).toEqual({ kind: "done", check });
  });

  it("sends a paused turn back with the reply so far, a few times at most", () => {
    const paused = reply([text("Searching")], "pause_turn");
    const next = afterReply(request, params, paused, 0);
    expect(next).toEqual({ kind: "resume", params: { ...params, messages: [...params.messages, { role: "assistant", content: paused.content }] } });
    expect(afterReply(request, params, paused, MAX_RESUMES)).toEqual({ kind: "failed", error: "Claude's searching ran too long. Try again." });
  });

  it("fails a refusal, a cut-short reply and an unreadable one", () => {
    expect(afterReply(request, params, reply([], "refusal"), 0)).toEqual({ kind: "failed", error: "Claude declined to check this copy." });
    expect(afterReply(request, params, reply([text("{")], "max_tokens"), 0)).toEqual({ kind: "failed", error: "Claude's check was cut short." });
    expect(afterReply(request, params, reply([text("not json")]), 0)).toEqual({ kind: "failed", error: "Claude's check came back unreadable." });
  });
});

describe("askCopyCheck", () => {
  it("takes a paused search up again until the check comes", async () => {
    const sent: unknown[] = [];
    const replies = [reply([text("Searching")], "pause_turn"), reply([text(JSON.stringify(check))])];
    const outcome = await askCopyCheck(request, async (params) => {
      sent.push(params);
      return replies.shift()!;
    });
    expect(outcome).toEqual({ check });
    expect(sent).toHaveLength(2);
  });

  it("refuses what is not a request, or not of a lesson, without calling Claude", async () => {
    const never = async (): Promise<Message> => {
      throw new Error("called");
    };
    expect(await askCopyCheck({ page: "/x" }, never)).toEqual({ status: 400, error: "That is no copy to check." });
    expect(await askCopyCheck({ ...request, page: "/recall.html" }, never)).toEqual({ status: 404, error: "This page shows no lesson." });
  });

  it("answers a failed check with a bad gateway", async () => {
    expect(await askCopyCheck(request, async () => reply([], "refusal"))).toEqual({ status: 502, error: "Claude declined to check this copy." });
  });
});
