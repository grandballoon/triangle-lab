// A dev server for testing one of the project's Vite plugins against real
// requests: the project's pages, only the given plugins, a free port, no
// file watching and no dependency pre-bundling. The plugin tests never load a
// module in a browser, and pre-bundling runs in the background, where the
// test's closing the server could cut it off midway.

import { resolve } from "node:path";
import { createServer, type PluginOption, type ViteDevServer } from "vite";

export interface TestServer {
  server: ViteDevServer;
  /** The server's origin, with no trailing slash. */
  base: string;
}

export async function startTestServer(plugins: PluginOption[]): Promise<TestServer> {
  const server = await createServer({
    configFile: false,
    root: resolve(import.meta.dirname, ".."),
    logLevel: "silent",
    plugins,
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { host: "127.0.0.1", port: 0, watch: null },
  });
  await server.listen();
  return { server, base: server.resolvedUrls!.local[0].replace(/\/$/, "") };
}
