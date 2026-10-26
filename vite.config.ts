import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { uiFeedback } from "./tools/feedback-plugin.ts";

// The hand-tracking WASM runtime is fetched from a CDN at run time and must
// match the installed library exactly, so its version is read from the
// package rather than repeated in source (src/hands/tracker.ts).
const mediapipe = JSON.parse(
  readFileSync(resolve(__dirname, "node_modules/@mediapipe/tasks-vision/package.json"), "utf8"),
) as { version: string };

// One project, several pages. The root index.html is the lesson menu; each
// standalone lesson is its own HTML entry point; lab.html hosts every lab
// lesson (src/lab/lessons), loading each one on demand; recall.html asks back
// the questions noted in the lessons (src/recall).
//
// The built site is served from the root of its own origin by the Worker in
// wrangler.jsonc, which also holds the recall deck at /deck.
export default defineConfig({
  // Dev only: Alt-click any element to leave a comment in ui-feedback.md.
  plugins: [uiFeedback(resolve(__dirname, "ui-feedback.md"))],
  define: {
    __MEDIAPIPE_VERSION__: JSON.stringify(mediapipe.version),
  },
  server: {
    // getUserMedia needs a secure context; localhost qualifies, so the
    // webcam background works out of the box under `npm run dev`.
    host: "localhost",
    port: 5173,
    // The recall deck, from the Worker run by `npm run preview` beside the
    // dev server, so syncing works in development as on the site.
    proxy: { "/deck": "http://localhost:8787" },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        lab: resolve(__dirname, "lab.html"),
        recall: resolve(__dirname, "recall.html"),
        angles: resolve(__dirname, "angles.html"),
        equilateral: resolve(__dirname, "equilateral.html"),
        isosceles: resolve(__dirname, "isosceles.html"),
        scalene: resolve(__dirname, "scalene.html"),
        perimeter: resolve(__dirname, "perimeter.html"),
        medians: resolve(__dirname, "medians.html"),
        bisectors: resolve(__dirname, "bisectors.html"),
        altitudes: resolve(__dirname, "altitudes.html"),
        inequality: resolve(__dirname, "inequality.html"),
        pythagoras: resolve(__dirname, "pythagoras.html"),
        congruence: resolve(__dirname, "congruence.html"),
        similar: resolve(__dirname, "similar.html"),
        trig: resolve(__dirname, "trig.html"),
        fortyfive: resolve(__dirname, "fortyfive.html"),
        thirtysixty: resolve(__dirname, "thirtysixty.html"),
        table: resolve(__dirname, "table.html"),
      },
    },
  },
});
