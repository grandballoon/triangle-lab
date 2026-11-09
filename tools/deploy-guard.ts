// Stops a deploy that would leave the site shut. While SENDER is empty no
// sign-in link can be sent (worker/auth.ts), so no one could sign in; on
// staging, while ACCESS_ISSUER or ACCESS_AUD is empty, its dev tools refuse
// everything (worker/staging-rules.ts). Both deploy workflows, and
// `npm run deploy` and `deploy:staging`, run this first:
//
//   node tools/deploy-guard.ts               production
//   node tools/deploy-guard.ts --env staging

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = resolve(import.meta.dirname, "..");

/** The vars a deploy needs, for production (null) or an environment. */
export function needed(env: string | null): string[] {
  return env === "staging" ? ["SENDER", "ACCESS_ISSUER", "ACCESS_AUD"] : ["SENDER"];
}

/** The vars `config`, wrangler.jsonc as parsed, leaves empty that a deploy to `env` (null for production) needs. */
export function unsetVars(config: unknown, env: string | null): string[] {
  const top = isObject(config) ? config : {};
  const scope = env === null ? top : isObject(top.env) && isObject(top.env[env]) ? top.env[env] : {};
  const vars = isObject(scope.vars) ? scope.vars : {};
  return needed(env).filter((name) => typeof vars[name] !== "string" || !vars[name].trim());
}

function main(args: string[]): number {
  const env = args[0] === "--env" ? (args[1] ?? "") : null;
  const path = resolve(ROOT, "wrangler.jsonc");
  const { config, error } = ts.parseConfigFileTextToJson(path, readFileSync(path, "utf8"));
  if (error) {
    console.error(`wrangler.jsonc does not parse: ${String(error.messageText)}`);
    return 1;
  }
  const unset = unsetVars(config, env);
  if (unset.length === 0) return 0;
  const where = env === null ? "vars" : `env.${env}.vars`;
  console.error(
    `Not deploying: ${unset.join(" and ")} ${unset.length === 1 ? "is" : "are"} empty under ${where} in wrangler.jsonc, ` +
      "so the site would stay shut. Set them (README.md, \"Signing in\" and \"Staging\").",
  );
  return 1;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
