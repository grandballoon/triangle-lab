// Cloudflare Access, as the Worker checks it: Access stands in front of the
// site and forwards a signed token (Cf-Access-Jwt-Assertion) with every
// request it lets through, and the Worker checks that token itself before
// serving its own paths, so nothing reaches them past Access, even if Access
// were turned off or bypassed. Production checks it on the deck and the calls
// to Claude (rules.ts), staging on its dev tools too (staging-rules.ts).
//
// Pure: a token taken apart, and whether its claims are good for the
// application now. The signature is checked against the team's published
// keys in access-keys.ts.

/**
 * Whether a request to `hostname` is let in without Access: only on
 * `localhost`, where `wrangler dev` and the Vite dev server's proxy serve the
 * Worker, with no Access in front. Cloudflare routes a request to a deployed
 * Worker only by a hostname it serves (its workers.dev address or a custom
 * domain), so a deployed Worker never sees this one.
 */
export function waivedLocally(hostname: string): boolean {
  return hostname === "localhost";
}

/** The Access application a Worker sits behind. */
export interface Access {
  /** The Access team's issuer, `https://<team>.cloudflareaccess.com`. */
  issuer: string;
  /** The Access application's audience tag. */
  aud: string;
}

/** A JSON Web Token taken apart; its signature is checked by access-keys.ts. */
export interface Jwt {
  header: { alg?: unknown; kid?: unknown };
  claims: Record<string, unknown>;
  /** The bytes the signature is over: `<header>.<payload>`. */
  signed: Uint8Array;
  signature: Uint8Array;
}

function fromBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "="));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

function json(bytes: Uint8Array | null): Record<string, unknown> | null {
  if (!bytes) return null;
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Take a token apart, or null when it is not one. */
export function readJwt(token: string | null): Jwt | null {
  const parts = (token ?? "").split(".");
  if (parts.length !== 3) return null;
  const header = json(fromBase64Url(parts[0]));
  const claims = json(fromBase64Url(parts[1]));
  const signature = fromBase64Url(parts[2]);
  if (!header || !claims || !signature) return null;
  return { header, claims, signed: new TextEncoder().encode(`${parts[0]}.${parts[1]}`), signature };
}

/** Access signs with RS256 only. */
export const JWT_ALG = "RS256";

/** Where the Access team publishes the keys it signs with. */
export const certsUrl = (issuer: string): string => `${issuer.replace(/\/$/, "")}/cdn-cgi/access/certs`;

/** Room for the Worker's clock and Access's to disagree. */
const CLOCK_SKEW_S = 60;

/** Why a signed token's claims are not good for this application now (ms), or null. */
export function claimsProblem(claims: Record<string, unknown>, access: Access, now: number): string | null {
  const seconds = now / 1000;
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (claims.iss !== access.issuer.replace(/\/$/, "")) return "The Access token is from another team.";
  if (!aud.includes(access.aud)) return "The Access token is for another application.";
  if (typeof claims.exp !== "number" || claims.exp + CLOCK_SKEW_S < seconds) return "The Access token has expired.";
  if (typeof claims.nbf === "number" && claims.nbf - CLOCK_SKEW_S > seconds) return "The Access token is not valid yet.";
  return null;
}
