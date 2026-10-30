// The staging build: the site as production builds it, plus the dev tools
// (the UI feedback overlay and the step editor), for the protected staging
// Worker (worker/staging.ts, `env.staging` in wrangler.jsonc). Built by
// `npm run build:staging`, which runs `vite build --mode staging`.

import type { ConfigEnv, UserConfig } from "vite";

export const STAGING_MODE = "staging";

/** A plugin's `apply`: the dev tools are on the dev server and in the staging build, never in production. */
export function devTools(_config: UserConfig, env: ConfigEnv): boolean {
  return env.command === "serve" || env.mode === STAGING_MODE;
}
