// Learners' own Claude API keys, encrypted for keeping (accounts.ts) with
// the VAULT_KEY secret: AES-GCM, so a kept key can be neither read nor
// altered without it. Each is bound to the learner's email as additional
// data, so a kept key moved to another learner's row will not decrypt.
//
// VAULT_KEY is 32 random bytes, base64: `openssl rand -base64 32`.
// Replacing it makes every kept key unreadable; learners then save theirs
// again, and until they do their calls fall back to their beta credit.

const IV_BYTES = 12;

/** The AES-GCM key VAULT_KEY names, or null when it is not 32 bytes of base64. */
export async function vaultKey(secret: string | undefined): Promise<CryptoKey | null> {
  const raw = fromBase64(secret?.trim() ?? "");
  if (!raw || raw.length !== 32) return null;
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** `apiKey`, encrypted for `email`: base64 of the IV, then the ciphertext. */
export async function seal(key: CryptoKey, email: string, apiKey: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: bytes(email) }, key, bytes(apiKey));
  const out = new Uint8Array(IV_BYTES + sealed.byteLength);
  out.set(iv);
  out.set(new Uint8Array(sealed), IV_BYTES);
  return toBase64(out);
}

/** The API key `sealed` holds for `email`, or null when it does not open: another key, another learner, or altered. */
export async function open(key: CryptoKey, email: string, sealed: string): Promise<string | null> {
  const raw = fromBase64(sealed);
  if (!raw || raw.length <= IV_BYTES) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, IV_BYTES), additionalData: bytes(email) }, key, raw.slice(IV_BYTES));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function toBase64(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data));
}

function fromBase64(text: string): Uint8Array | null {
  try {
    return Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}
