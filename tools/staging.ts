// Brings what was left on staging home. `npm run staging:pull` takes the
// Alt-click comments the staging Worker kept (worker/staging.ts) and appends
// them to ui-feedback.md, just as the dev server writes comments, then tells
// staging to forget them. Step edits need no pulling: they are commits on the
// staging branch, merged like any other.
//
// Staging sits behind Cloudflare Access, so this calls it with an Access
// service token, from .dev.vars:
//   STAGING_URL                    https://triangle-lab-staging.<account>.workers.dev
//   STAGING_ACCESS_CLIENT_ID       the service token's client id
//   STAGING_ACCESS_CLIENT_SECRET   and its secret

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { FEEDBACK_ENDPOINT, formatEntry } from "../src/dev/feedback/entry.ts";
import type { InboxItem } from "../worker/staging-rules.ts";
import { devVar } from "./dev-vars.ts";
import { record } from "./feedback-plugin.ts";

const ROOT = resolve(import.meta.dirname, "..");

export interface Staging {
  url: string;
  clientId: string;
  clientSecret: string;
}

const NAMES = { url: "STAGING_URL", clientId: "STAGING_ACCESS_CLIENT_ID", clientSecret: "STAGING_ACCESS_CLIENT_SECRET" } as const;

/** Where staging is and how to get past Access, from a .dev.vars file; or what is missing from it. */
export function stagingOf(devVars: string): Staging | { missing: string[] } {
  const values = Object.fromEntries(Object.entries(NAMES).map(([key, name]) => [key, devVar(devVars, name) ?? ""]));
  const missing = Object.entries(NAMES).flatMap(([key, name]) => (values[key] ? [] : [name]));
  return missing.length > 0 ? { missing } : (values as unknown as Staging);
}

/** The headers Access lets a service token through with. */
export const accessHeaders = (staging: Staging): Record<string, string> => ({
  "CF-Access-Client-Id": staging.clientId,
  "CF-Access-Client-Secret": staging.clientSecret,
});

/** Kept comments as ui-feedback.md sections, each stamped with when it was left. */
export function pulledText(items: readonly InboxItem[]): string {
  return items.map((item) => formatEntry(item.entry, new Date(item.at))).join("");
}

async function pull(): Promise<number> {
  const staging = stagingOf(await readFile(join(ROOT, ".dev.vars"), "utf8").catch(() => ""));
  if ("missing" in staging) {
    console.error(`Set ${staging.missing.join(", ")} in .dev.vars (README.md, "Staging").`);
    return 1;
  }
  const endpoint = staging.url.replace(/\/$/, "") + FEEDBACK_ENDPOINT;
  const res = await fetch(endpoint, { headers: accessHeaders(staging), redirect: "manual" });
  if (!res.ok) {
    console.error(`Staging answered ${res.status}${res.status >= 300 && res.status < 400 ? " (a redirect to sign in: check the service token and the Access policy)" : ""}: ${await res.text()}`);
    return 1;
  }
  const items = (await res.json()) as InboxItem[];
  if (items.length === 0) {
    console.log("No comments waiting on staging.");
    return 0;
  }
  await record(join(ROOT, "ui-feedback.md"), pulledText(items));
  const through = items[items.length - 1].id;
  const cleared = await fetch(`${endpoint}?through=${through}`, { method: "DELETE", headers: accessHeaders(staging), redirect: "manual" });
  if (!cleared.ok) {
    console.error(`Wrote ${items.length} comments to ui-feedback.md, but staging would not forget them (${cleared.status}); the next pull brings them again.`);
    return 1;
  }
  console.log(`Wrote ${items.length} comment${items.length === 1 ? "" : "s"} from staging to ui-feedback.md.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command] = process.argv.slice(2);
  const run = command === "pull" ? pull() : Promise.resolve((console.error("Use: node tools/staging.ts pull"), 1));
  run.then(
    (code) => (process.exitCode = code),
    (error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
