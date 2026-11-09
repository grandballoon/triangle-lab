// Signing in: who may, what a request to /auth/* does, the session cookie,
// and the sign-in email.

import { describe, expect, it } from "vitest";
import {
  afterRedeem,
  decideAuth,
  isInvited,
  LINK_PATH,
  normalEmail,
  SESSION_PATH,
  sessionCookie,
  sessionToken,
  signedInAs,
  signInEmail,
  signInUrl,
  type AuthAsked,
  type AuthSettings,
} from "./auth.ts";

const OWNER = "owner@example.com";
const settings: AuthSettings = { sender: "signin@example.com", invites: "demo@example.com, Friend@Example.com", owner: OWNER };
const TOKEN = "a".repeat(43);
const asked = (patch: Partial<AuthAsked>): AuthAsked => ({ method: "POST", path: LINK_PATH, body: { email: "demo@example.com" }, withinLimit: true, ...patch });

describe("normalEmail", () => {
  it("compares addresses trimmed and without case", () => {
    expect(normalEmail("  Demo@Example.COM ")).toBe("demo@example.com");
  });

  it("is null for anything that is not one address", () => {
    for (const text of ["", "demo", "demo@example", "a b@example.com", "a@example.com,b@example.com", `${"a".repeat(250)}@example.com`, 7, null]) {
      expect(normalEmail(text), String(text)).toBeNull();
    }
  });
});

describe("isInvited", () => {
  it("lets in the owner and everyone on the list, whatever the case or separator", () => {
    expect(isInvited(OWNER, "", OWNER)).toBe(true);
    expect(isInvited("friend@example.com", settings.invites, OWNER)).toBe(true);
    expect(isInvited("b@example.com", "a@example.com;b@example.com\nc@example.com", OWNER)).toBe(true);
  });

  it("lets in no one else, and nothing that is not an address", () => {
    expect(isInvited("stranger@example.com", settings.invites, OWNER)).toBe(false);
    expect(isInvited("", "", "")).toBe(false);
    expect(isInvited("-", "-", OWNER)).toBe(false);
  });
});

describe("decideAuth, asking for a link", () => {
  it("sends a link to an invited address, as compared", () => {
    expect(decideAuth(asked({ body: { email: " Demo@Example.com" } }), settings)).toEqual({ kind: "send-link", email: "demo@example.com" });
    expect(decideAuth(asked({ body: { email: OWNER } }), settings)).toEqual({ kind: "send-link", email: OWNER });
  });

  it("answers as if it sent one to any other address, so who is invited never shows", () => {
    expect(decideAuth(asked({ body: { email: "stranger@example.com" } }), settings)).toEqual({ kind: "pretend-sent" });
  });

  it("refuses what is not an address, a caller over the limit, and every method but POST", () => {
    expect(decideAuth(asked({ body: { email: "nope" } }), settings)).toMatchObject({ status: 400 });
    expect(decideAuth(asked({ body: null }), settings)).toMatchObject({ status: 400 });
    expect(decideAuth(asked({ withinLimit: false }), settings)).toMatchObject({ status: 429 });
    expect(decideAuth(asked({ method: "GET" }), settings)).toMatchObject({ status: 405 });
  });

  it("is off while the sender is not set", () => {
    expect(decideAuth(asked({}), { ...settings, sender: "" })).toMatchObject({ status: 503, error: expect.stringContaining("SENDER") });
  });
});

describe("decideAuth, the session", () => {
  const session = (patch: Partial<AuthAsked>) => asked({ path: SESSION_PATH, ...patch });

  it("trades a link's token for a session", () => {
    expect(decideAuth(session({ body: { token: TOKEN } }), settings)).toEqual({ kind: "redeem", token: TOKEN });
    for (const body of [{ token: "short" }, { token: `${TOKEN}!` }, {}, null]) {
      expect(decideAuth(session({ body }), settings)).toMatchObject({ status: 400 });
    }
  });

  it("says who is signed in, and signs out, even while links cannot be sent", () => {
    const off = { ...settings, sender: "" };
    expect(decideAuth(session({ method: "GET", body: null }), off)).toEqual({ kind: "who" });
    expect(decideAuth(session({ method: "DELETE", body: null }), off)).toEqual({ kind: "sign-out" });
    expect(decideAuth(session({ method: "PUT" }), settings)).toMatchObject({ status: 405 });
  });
});

describe("afterRedeem and signedInAs", () => {
  it("starts a session only for a live link to an address still invited", () => {
    expect(afterRedeem("demo@example.com", settings)).toEqual({ kind: "start", email: "demo@example.com" });
    expect(afterRedeem(null, settings)).toMatchObject({ status: 400, error: expect.stringContaining("expired") });
    expect(afterRedeem("gone@example.com", settings)).toMatchObject({ status: 403 });
  });

  it("names a session's learner only while they are still invited, so taking them off the list signs them out", () => {
    expect(signedInAs("demo@example.com", settings)).toBe("demo@example.com");
    expect(signedInAs("demo@example.com", { ...settings, invites: "-" })).toBeNull();
    expect(signedInAs(null, settings)).toBeNull();
  });
});

describe("the session cookie", () => {
  it("is read from among the others, and only when it looks like a token", () => {
    expect(sessionToken(`theme=dark; session=${TOKEN}; other=1`)).toBe(TOKEN);
    expect(sessionToken("session=short")).toBeNull();
    expect(sessionToken("sessions=" + TOKEN)).toBeNull();
    expect(sessionToken(null)).toBeNull();
  });

  it("is kept out of scripts' and other sites' reach, Secure over HTTPS, and cleared on signing out", () => {
    expect(sessionCookie(TOKEN, true, 60_000)).toBe(`session=${TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=60; Secure`);
    expect(sessionCookie(TOKEN, false, 60_000)).toBe(`session=${TOKEN}; Path=/; HttpOnly; SameSite=Lax; Max-Age=60`);
    expect(sessionCookie(null, true)).toBe("session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure");
  });
});

describe("the sign-in email", () => {
  it("links to the sign-in page on the site it was asked from, with the token", () => {
    expect(signInUrl("https://triangle-lab.example.com", TOKEN)).toBe(`https://triangle-lab.example.com/signin.html?token=${TOKEN}`);
  });

  it("goes to the learner from the sender, with the link in text and HTML both", () => {
    const link = signInUrl("https://site.example.com", TOKEN);
    const mail = signInEmail("demo@example.com", "signin@example.com", link);
    expect(mail).toMatchObject({ to: "demo@example.com", from: { email: "signin@example.com", name: "Triangle Lab" }, subject: "Sign in to Triangle Lab" });
    expect(mail.text).toContain(link);
    expect(mail.html).toContain(`href="${link}"`);
    expect(mail.text).toContain("15 minutes");
  });
});
