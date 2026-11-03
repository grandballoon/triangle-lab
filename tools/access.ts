// Stops a deploy that would let no one in. The Worker serves its paths only
// to requests Cloudflare Access let through (worker/access.ts), and while its
// ACCESS_ISSUER or ACCESS_AUD is empty it refuses everything, so a deploy
// without them would leave the site's deck and its calls to Claude shut.
// Both deploy workflows, and `npm run deploy` and `deploy:staging`, run this
// first:
//
//   node tools/access.ts               production
//   node tools/access.ts --env staging

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(import.meta.dirname, "..");

const NAMES = ["ACCESS_ISSUER", "ACCESS_AUD"] as const;

/** The Access vars `config`, wrangler.jsonc as parsed, leaves empty for `env` (null for production). */
export function accessUnset(config: unknown, env: string | null): string[] {
  const top = isObject(config) ? config : {};
  const scope = env === null ? top : isObject(top.env) && isObject(top.env[env]) ? top.env[env] : {};
  const vars = isObject(scope.vars) ? scope.vars : {};
  return NAMES.filter((name) => typeof vars[name] !== "string" || !vars[name].trim());
}

function main(args: string[]): number {
  const env = args[0] === "--env" ? (args[1] ?? "") : null;
  const path = resolve(ROOT, "wrangler.jsonc");
  const { config, error } = ts.parseConfigFileTextToJson(path, readFileSync(path, "utf8"));
  if (error) {
    console.error(`wrangler.jsonc does not parse: ${String(error.messageText)}`);
    return 1;
  }
  const unset = accessUnset(config, env);
  if (unset.length === 0) return 0;
  const where = env === null ? "vars" : `env.${env}.vars`;
  console.error(
    `Not deploying: ${unset.join(" and ")} ${unset.length === 1 ? "is" : "are"} empty under ${where} in wrangler.jsonc, ` +
      "so the Worker would let no one in. Put Cloudflare Access in front of the site and set them (README.md).",
  );
  return 1;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
