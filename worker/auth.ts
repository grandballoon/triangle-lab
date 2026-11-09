// Signing in to the site: who may, and how a sign-in is made and kept.
//
// A learner asks for a sign-in link with their email (POST /auth/link). If
// the address is invited, the Worker emails them a link to signin.html
// carrying a one-time token, good for LINK_TTL_MS. The page sends the token
// back (POST /auth/session), and the Worker trades it for a session, kept in
// an HttpOnly cookie for SESSION_TTL_MS. The page's own requests carry the
// cookie from then on, and the Worker serves the deck of whoever it names
// (rules.ts). GET /auth/session says who is signed in; DELETE signs out.
//
// The link goes to a page, not straight to the Worker, so a mail scanner
// that opens links ahead of the learner cannot spend the token: only the
// page's POST does.
//
// Who may sign in is the INVITES secret, a list of email addresses, and the
// owner (OWNER_EMAIL). It is checked again on every request, so taking an
// address off the list ends that learner's sessions at once.
//
// Tokens are random and held only as their SHA-256 hash (accounts.ts), so
// the store never holds anything that could be used to sign in.
//
// Pure: what to do with a request to /auth/*, the invite list, cookies, and
// the email. index.ts does the I/O.

/** Where sign-in links are asked for. */
export const LINK_PATH = "/auth/link";
/** Where a session is made from a link's token, read, and ended. */
export const SESSION_PATH = "/auth/session";
export const AUTH_PATHS: readonly string[] = [LINK_PATH, SESSION_PATH];

/** How long a sign-in link works for. */
export const LINK_TTL_MS = 15 * 60 * 1000;
/** How long a sign-in lasts. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** The cookie holding the session's token. */
export const SESSION_COOKIE = "session";

/** Where a sign-in link takes the learner, relative to the site's root. */
export const SIGN_IN_PAGE = "/signin.html";

/** Largest body /auth/* reads: an email address or a token, with room to spare. */
export const MAX_AUTH_BODY = 2_000;

/** An email address as compared: trimmed and lower-cased, or null when it is not one. */
export function normalEmail(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const email = text.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email) ? email : null;
}

/**
 * Whether `email` may sign in: it is the owner's, or on `invites`, the
 * INVITES secret, addresses separated by commas, semicolons or whitespace.
 */
export function isInvited(email: string, invites: string, owner: string): boolean {
  const wanted = normalEmail(email);
  if (!wanted) return false;
  const listed = [owner, ...invites.split(/[\s,;]+/)].map(normalEmail);
  return listed.includes(wanted);
}

export interface AuthAsked {
  method: string;
  path: string;
  /** The body, parsed as JSON; null when there was none or it did not parse. */
  body: unknown;
  /** Whether the caller is within the rate limit for its address. */
  withinLimit: boolean;
}

export interface AuthSettings {
  /** The address sign-in links are sent from; empty while unset. */
  sender: string;
  invites: string;
  owner: string;
}

export type AuthDecision =
  /** Email a sign-in link to `email`, an invited address. */
  | { kind: "send-link"; email: string }
  /** Answer as if a link were sent, so whether an address is invited never shows. */
  | { kind: "pretend-sent" }
  /** Trade a link's token for a session. */
  | { kind: "redeem"; token: string }
  /** Say who the session names. */
  | { kind: "who" }
  /** End the session. */
  | { kind: "sign-out" }
  | { kind: "refuse"; status: number; error: string };

/** What to do with a request to one of AUTH_PATHS. */
export function decideAuth(asked: AuthAsked, settings: AuthSettings): AuthDecision {
  const methods = asked.path === LINK_PATH ? ["POST"] : ["GET", "POST", "DELETE"];
  if (!methods.includes(asked.method)) return refuse(405, `Use ${methods.join(" or ")}.`);
  if (!asked.withinLimit) return refuse(429, "Too many requests. Try again in a minute.");
  if (asked.path === SESSION_PATH) {
    if (asked.method === "GET") return { kind: "who" };
    if (asked.method === "DELETE") return { kind: "sign-out" };
    const token = field(asked.body, "token");
    return token && /^[A-Za-z0-9_-]{20,100}$/.test(token) ? { kind: "redeem", token } : refuse(400, "That is not a sign-in link.");
  }
  if (!normalEmail(settings.sender)) return refuse(503, "Signing in is off: the Worker's SENDER is not set.");
  const email = normalEmail(field(asked.body, "email"));
  if (!email) return refuse(400, "That is not an email address.");
  return isInvited(email, settings.invites, settings.owner) ? { kind: "send-link", email } : { kind: "pretend-sent" };
}

/**
 * Whether a session may be made for `email`, the address a link's token was
 * for, or null for a token that is spent, expired or never was; the address
 * may have been taken off the invite list since the link was sent.
 */
export function afterRedeem(
  email: string | null,
  settings: Pick<AuthSettings, "invites" | "owner">,
): { kind: "refuse"; status: number; error: string } | { kind: "start"; email: string } {
  if (!email) return refuse(400, "This sign-in link has expired or has been used. Ask for another.");
  if (!isInvited(email, settings.invites, settings.owner)) return refuse(403, "This address is no longer invited.");
  return { kind: "start", email };
}

/**
 * The email a session names, if it still may: `email` is what the store holds
 * for the session's token (null for none, or one expired), checked against
 * the invite list as it is now.
 */
export function signedInAs(email: string | null, settings: Pick<AuthSettings, "invites" | "owner">): string | null {
  return email && isInvited(email, settings.invites, settings.owner) ? email : null;
}

/** The session's token in a Cookie header, or null. */
export function sessionToken(cookie: string | null): string | null {
  for (const part of (cookie ?? "").split(";")) {
    const at = part.indexOf("=");
    if (at < 0 || part.slice(0, at).trim() !== SESSION_COOKIE) continue;
    const value = part.slice(at + 1).trim();
    return /^[A-Za-z0-9_-]{20,100}$/.test(value) ? value : null;
  }
  return null;
}

/**
 * The Set-Cookie header keeping `token` for `ms`, or clearing it when `token`
 * is null. HttpOnly, so no script can read it; SameSite=Lax, so no other
 * site's page can send it with a request that changes anything; Secure
 * wherever the site is served over HTTPS, which is everywhere but
 * development on localhost.
 */
export function sessionCookie(token: string | null, secure: boolean, ms = SESSION_TTL_MS): string {
  const parts = [`${SESSION_COOKIE}=${token ?? ""}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${token ? Math.floor(ms / 1000) : 0}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** The link a sign-in email carries, on the site at `origin`. */
export function signInUrl(origin: string, token: string): string {
  return `${origin}${SIGN_IN_PAGE}?token=${token}`;
}

/** The sign-in email for `to`, from `sender`, carrying `link`. */
export function signInEmail(to: string, sender: string, link: string): { to: string; from: { email: string; name: string }; subject: string; text: string; html: string } {
  const minutes = LINK_TTL_MS / 60_000;
  const escaped = link.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return {
    to,
    from: { email: sender, name: "Triangle Lab" },
    subject: "Sign in to Triangle Lab",
    text: `Open this link to sign in to Triangle Lab:\n\n${link}\n\nIt works once, for the next ${minutes} minutes. If you didn't ask to sign in, you can ignore this email.\n`,
    html:
      `<p>Open this link to sign in to Triangle Lab:</p>` +
      `<p><a href="${escaped}">Sign in to Triangle Lab</a></p>` +
      `<p>It works once, for the next ${minutes} minutes. If you didn't ask to sign in, you can ignore this email.</p>`,
  };
}

function field(body: unknown, name: string): string | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const value = (body as Record<string, unknown>)[name];
  return typeof value === "string" ? value : null;
}

function refuse(status: number, error: string): { kind: "refuse"; status: number; error: string } {
  return { kind: "refuse", status, error };
}
