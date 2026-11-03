// Checking a Cloudflare Access token's signature against the keys the Access
// team publishes, fetched and kept for a while. The token is taken apart and
// its claims judged in access.ts; this does the I/O and the cryptography.

import { certsUrl, JWT_ALG, readJwt } from "./access.ts";

/** Access's signing keys, kept for a while: they change rarely, and every request needs them. */
let certs: { issuer: string; keys: JsonWebKey[]; until: number } | null = null;
const CERTS_TTL_MS = 10 * 60 * 1000;

async function signingKeys(issuer: string, refresh: boolean): Promise<JsonWebKey[]> {
  if (!refresh && certs?.issuer === issuer && certs.until > Date.now()) return certs.keys;
  const res = await fetch(certsUrl(issuer));
  const body = res.ok ? ((await res.json()) as { keys?: JsonWebKey[] }) : {};
  const keys = Array.isArray(body.keys) ? body.keys : [];
  certs = { issuer, keys, until: Date.now() + CERTS_TTL_MS };
  return keys;
}

/** The claims of an Access token whose signature holds, or null. */
export async function verifiedClaims(token: string | null, issuer: string): Promise<Record<string, unknown> | null> {
  const jwt = readJwt(token);
  if (!jwt || jwt.header.alg !== JWT_ALG) return null;
  const find = (keys: JsonWebKey[]) => keys.find((k) => (k as { kid?: unknown }).kid === jwt.header.kid);
  // A key not seen yet may be a new one Access has rotated in.
  const jwk = find(await signingKeys(issuer, false)) ?? find(await signingKeys(issuer, true));
  if (!jwk) return null;
  const algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
  const key = await crypto.subtle.importKey("jwk", jwk, algorithm, false, ["verify"]);
  return (await crypto.subtle.verify(algorithm, key, jwt.signature, jwt.signed)) ? jwt.claims : null;
}
