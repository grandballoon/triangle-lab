// What a standalone lesson and its page chrome (page.ts) tell each other.
// They are separate module scripts on one page, so they meet here, in a
// module both import and the browser evaluates once.
//
//   - page.ts sets the current step; a lesson whose figure changes with the
//     steps reads it each frame.
//   - A lesson with live numbers asks for the formula band at start-up and
//     hands it fresh rows each frame; page.ts shows them.
//
// The lesson's script comes first in each page's HTML, so by the time
// page.ts builds the chrome it already knows whether to make room for the
// band.

import type { Readout } from "./lab/scene.ts";

let step = 0;
let rows: readonly Readout[] | null = null;

/** The step the step column has current, counted from 0. */
export const currentStep = (): number => step;

export function setStep(next: number): void {
  step = next;
}

/**
 * Ask for the formula band along the bottom of the page. Call once, while
 * the lesson's module is first evaluated; the returned function replaces
 * the rows shown.
 */
export function formulaBand(): (next: readonly Readout[]) => void {
  rows ??= [];
  return (next) => {
    rows = next;
  };
}

/** The rows to show in the formula band, or null when the lesson has none. */
export const formulaRows = (): readonly Readout[] | null => rows;
