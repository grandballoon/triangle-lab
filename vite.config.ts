import { defineConfig } from "vite";
import { resolve } from "node:path";

// One project, several lesson pages. Each demo is its own HTML entry point; the
// root index.html is the lesson menu that links them.
export default defineConfig({
  // GitHub Pages serves this project site from a subpath
  // (grandballoon.github.io/triangle-lab/), so asset URLs must be
  // prefixed accordingly. Left as "/" for local dev and previews.
  base: process.env.GITHUB_ACTIONS ? "/triangle-lab/" : "/",
  server: {
    // getUserMedia needs a secure context; localhost qualifies, so the
    // webcam background works out of the box under `npm run dev`.
    host: "localhost",
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
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
