import { defineConfig } from "vite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { uiFeedback } from "./tools/feedback-plugin.ts";
import { stepEditor } from "./tools/step-editor-plugin.ts";

// The hand-tracking WASM runtime is fetched from a CDN at run time and must
// match the installed library exactly, so its version is read from the
// package rather than repeated in source (src/hands/tracker.ts).
const mediapipe = JSON.parse(
  readFileSync(resolve(__dirname, "node_modules/@mediapipe/tasks-vision/package.json"), "utf8"),
) as { version: string };

// One project, several pages. The root index.html is the lesson menu; each
// standalone lesson is its own HTML entry point; lab.html hosts every lab
// lesson (src/lab/lessons), loading each one on demand; ar.html places one
// lab lesson's figure in the camera view in perspective (src/ar); recall.html
// asks back the questions noted in the lessons (src/recall).
//
// The built site is served from the root of its own origin by the Worker in
// wrangler.jsonc, which also signs learners in at /auth/*, holds their recall
// decks at /deck, calls Claude at /check, /associate and /explain, and says
// how those calls are paid for at /account.
export default defineConfig({
  // The dev tools, on the dev server and in the staging build
  // (tools/staging-mode.ts): Alt-click any element to leave a comment, and
  // "Edit steps" rewrites a lesson's step text in its source.
  plugins: [uiFeedback(resolve(__dirname, "ui-feedback.md")), stepEditor(__dirname)],
  define: {
    __MEDIAPIPE_VERSION__: JSON.stringify(mediapipe.version),
  },
  server: {
    // getUserMedia needs a secure context; localhost qualifies, so the
    // webcam background works out of the box under `npm run dev`.
    host: "localhost",
    port: 5173,
    // Signing in, the recall deck, and the calls to Claude, from the Worker run
    // by `npm run preview` beside the dev server, so all work in development
    // as on the site. The session cookie the Worker sets is the dev server's.
    proxy: {
      "/auth": "http://localhost:8787",
      "/deck": "http://localhost:8787",
      "/check": "http://localhost:8787",
      "/associate": "http://localhost:8787",
      "/explain": "http://localhost:8787",
      "/account": "http://localhost:8787",
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        lab: resolve(__dirname, "lab.html"),
        recall: resolve(__dirname, "recall.html"),
        ar: resolve(__dirname, "ar.html"),
        signin: resolve(__dirname, "signin.html"),
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
