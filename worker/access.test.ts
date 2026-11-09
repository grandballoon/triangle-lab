// Cloudflare Access tokens, as the Worker takes them apart and judges their claims.

import { describe, expect, it } from "vitest";
import { certsUrl, claimsProblem, readJwt } from "./access.ts";

const ACCESS = { issuer: "https://team.cloudflareaccess.com", aud: "aud-tag" };
const NOW = 1_700_000_000_000;
const CLAIMS = { iss: ACCESS.issuer, aud: [ACCESS.aud], exp: NOW / 1000 + 600, nbf: NOW / 1000 - 10 };

describe("Access tokens", () => {
  const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

  it("takes a token apart", () => {
    const header = { alg: "RS256", kid: "k1" };
    const token = `${part(header)}.${part(CLAIMS)}.${Buffer.from([1, 2, 255]).toString("base64url")}`;
    expect(readJwt(token)).toEqual({
      header,
      claims: CLAIMS,
      signed: new TextEncoder().encode(token.slice(0, token.lastIndexOf("."))),
      signature: new Uint8Array([1, 2, 255]),
    });
    for (const bad of [null, "", "a.b", "a.b.c", `${part(header)}.${part([1])}.AA`, `${part(header)}.${part(CLAIMS)}.+/`]) {
      expect(readJwt(bad), String(bad)).toBeNull();
    }
  });

  it("checks the team, application and time", () => {
    expect(claimsProblem(CLAIMS, ACCESS, NOW)).toBeNull();
    expect(claimsProblem({ ...CLAIMS, aud: ACCESS.aud }, ACCESS, NOW)).toBeNull();
    expect(claimsProblem(CLAIMS, { ...ACCESS, issuer: `${ACCESS.issuer}/` }, NOW)).toBeNull();
    expect(claimsProblem({ ...CLAIMS, iss: "https://other.cloudflareaccess.com" }, ACCESS, NOW)).toBe("The Access token is from another team.");
    expect(claimsProblem({ ...CLAIMS, exp: NOW / 1000 - 120 }, ACCESS, NOW)).toBe("The Access token has expired.");
    expect(claimsProblem({ ...CLAIMS, exp: undefined }, ACCESS, NOW)).toBe("The Access token has expired.");
    expect(claimsProblem({ ...CLAIMS, nbf: NOW / 1000 + 120 }, ACCESS, NOW)).toBe("The Access token is not valid yet.");
    expect(certsUrl(ACCESS.issuer)).toBe("https://team.cloudflareaccess.com/cdn-cgi/access/certs");
  });
});
