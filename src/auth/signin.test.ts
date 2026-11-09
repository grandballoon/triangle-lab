// The sign-in page's views, and what each reply from the Worker makes of them.

import { describe, expect, it } from "vitest";
import { afterLink, afterRedeem, afterSignOut, afterWho, initialView, problem } from "./signin.ts";

const TOKEN = "t".repeat(43);

describe("initialView", () => {
  it("uses a link's token with a button, or else asks who is signed in", () => {
    expect(initialView(`?token=${TOKEN}`)).toEqual({ kind: "redeem", token: TOKEN, error: null });
    expect(initialView("")).toMatchObject({ kind: "busy" });
  });
});

describe("afterWho", () => {
  it("says who is signed in, or asks for an address", () => {
    expect(afterWho({ status: 200, body: { email: "a@example.com" } })).toEqual({ kind: "signed-in", email: "a@example.com", justNow: false });
    expect(afterWho({ status: 401, body: { error: "Signed out." } })).toEqual({ kind: "ask", email: "", error: null });
  });

  it("asks for an address, saying what went wrong, when the Worker could not say", () => {
    expect(afterWho(null)).toMatchObject({ kind: "ask", error: expect.stringContaining("Can't reach") });
    expect(afterWho({ status: 500, body: null })).toMatchObject({ kind: "ask", error: "Something went wrong (500). Try again." });
  });
});

describe("afterLink", () => {
  it("says a link is on its way, or keeps the address to fix with the Worker's reason", () => {
    expect(afterLink({ status: 202, body: { sent: true } }, "a@example.com")).toEqual({ kind: "sent", email: "a@example.com" });
    expect(afterLink({ status: 400, body: { error: "That is not an email address." } }, "nope")).toEqual({
      kind: "ask",
      email: "nope",
      error: "That is not an email address.",
    });
  });
});

describe("afterRedeem", () => {
  it("signs in, or asks for another link when this one is spent, or lets the button be tried again", () => {
    expect(afterRedeem({ status: 200, body: { email: "a@example.com" } }, TOKEN)).toEqual({ kind: "signed-in", email: "a@example.com", justNow: true });
    expect(afterRedeem({ status: 400, body: { error: "This sign-in link has expired." } }, TOKEN)).toEqual({
      kind: "ask",
      email: "",
      error: "This sign-in link has expired.",
    });
    expect(afterRedeem(null, TOKEN)).toMatchObject({ kind: "redeem", token: TOKEN, error: expect.stringContaining("Can't reach") });
  });
});

describe("afterSignOut", () => {
  it("asks for an address once signed out, or stays signed in when it failed", () => {
    expect(afterSignOut({ status: 200, body: {} }, "a@example.com")).toEqual({ kind: "ask", email: "", error: null });
    expect(afterSignOut(null, "a@example.com")).toEqual({ kind: "signed-in", email: "a@example.com", justNow: false });
  });
});

describe("problem", () => {
  it("prefers the Worker's own words", () => {
    expect(problem({ status: 429, body: { error: "Too many requests." } })).toBe("Too many requests.");
  });
});
