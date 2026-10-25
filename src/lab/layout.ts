// Where the chrome of a lesson page goes, and the room it leaves the figure.
// Both kinds of page use it: the lab shell (shell.ts) and the standalone
// pages' chrome (page.ts). Pure: the window's size and what the page shows
// in, boxes in CSS pixels out; arrange.ts writes them onto the page.
//
// There are two arrangements.
//
//   wide     The step column runs down the right, the formula band along the
//            bottom, and the figure sits between them under the top bar.
//   stacked  A phone held upright: the top bar takes two rows (pager, then
//            title), and the formula band and the steps are stacked along the
//            bottom at full width. The steps show one at a time (steps.ts),
//            in as little height as their tallest step needs, and the figure
//            gets everything else.
//
// The top bar itself is laid out in CSS (nav.css), which keys its stacked
// rows off the `data-layout` attribute arrange.ts sets on <html>; the
// heights below are the ones that CSS draws.

export type LayoutMode = "wide" | "stacked";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutInput {
  width: number;
  height: number;
  /** Width the docked curriculum rail takes from the left; 0 when it floats or is closed. */
  rail: number;
  /** Whether the formula band is shown. */
  formulas: boolean;
  /** Whether the lesson has a row of controls under the top bar (lab lessons only). */
  controls: boolean;
  /**
   * Height the stacked step list needs for its tallest step (steps.ts
   * `pagedHeight`), or 0 before it has been measured.
   */
  steps: number;
}

export interface ChromeLayout {
  mode: LayoutMode;
  /** Short of room either way: thinner margins and a formula band without its heading. */
  compact: boolean;
  /** Gap between the chrome and the window's edges, and between pieces of chrome. */
  edge: number;
  steps: Box;
  /** The formula band, or null while it is not shown. */
  formulas: Box | null;
  /** Where the row of lesson controls starts and how wide it may run; its height is its own. */
  controls: { x: number; y: number; width: number };
  /**
   * How far above the window's bottom the curriculum rail stops, or null for
   * its own default (clear of the hands pill in the bottom-left corner).
   */
  railBottom: number | null;
  /** Where the lab fits its stage, margins included. */
  figure: Box;
  /**
   * The box a standalone page's canvas fills. Those lessons keep the top
   * LESSON_TOP_MARGIN of their canvas clear for the top bar themselves, so
   * the box starts that far above the bottom of the bar.
   */
  canvas: Box;
}

/** Below this window width the page stacks (a phone held upright). */
const STACK_BELOW_WIDTH = 700;
/** Below this window height a wide page is compact (a phone on its side). */
const COMPACT_BELOW_HEIGHT = 560;

const EDGE = { regular: 18, compact: 10 } as const;

/** The formula band's height, with and without its heading. */
const FORMULA_BAND_HEIGHT = { regular: 116, compact: 88 } as const;

/** What a standalone lesson keeps clear at the top of its canvas (each lesson's TOP_MARGIN). */
const LESSON_TOP_MARGIN = 64;

const WIDE = {
  /** Top of the step column, just under the pager row. */
  columnTop: 60,
  /** Bottom of the top bar and the lab's controls row (lab.css #controls). */
  top: 104,
  /** The bar alone, as the standalone lessons have always assumed. */
  bar: LESSON_TOP_MARGIN,
} as const;

const STACKED = {
  /** Bottom of the two-row top bar (nav.css). */
  bar: 76,
  /** Height of the lab's controls row under it, gap included (lab.css #controls). */
  controls: 44,
  /** The steps never shrink below this, so the pager row and a few lines show. */
  minSteps: 96,
  /** Nor take more than this share of the window; a longer step scrolls. */
  maxStepsShare: 0.34,
} as const;

const PANEL_WIDTH = { min: 250, max: 340, share: 0.25 } as const;

/** How wide the step column is in a wide window this many CSS pixels across. */
function panelWidth(windowWidth: number): number {
  const { min, max, share } = PANEL_WIDTH;
  return Math.round(Math.min(max, Math.max(min, windowWidth * share)));
}

export function layoutChrome(input: LayoutInput): ChromeLayout {
  return input.width < STACK_BELOW_WIDTH ? stacked(input) : wide(input);
}

function wide({ width, height, rail, formulas }: LayoutInput): ChromeLayout {
  const compact = height < COMPACT_BELOW_HEIGHT;
  const edge = compact ? EDGE.compact : EDGE.regular;
  const bandHeight = compact ? FORMULA_BAND_HEIGHT.compact : FORMULA_BAND_HEIGHT.regular;
  const band = formulas ? box(edge, height - edge - bandHeight, width - 2 * edge, bandHeight) : null;
  // Everything above the band, or above the bottom margin without one.
  const floor = (band?.y ?? height) - edge;

  const panel = panelWidth(width);
  const steps = box(width - edge - panel, WIDE.columnTop, panel, floor - WIDE.columnTop);
  const right = steps.x - edge;
  return {
    mode: "wide",
    compact,
    edge,
    steps,
    formulas: band,
    controls: { x: edge + rail, y: WIDE.columnTop, width: right - edge - rail },
    railBottom: band ? height - floor : null,
    figure: span(edge + rail, WIDE.top, right, floor),
    // Without a band the canvas runs to the bottom of the window, as it
    // always has: altitudes.ts writes its scroll hint along that edge.
    canvas: span(rail, WIDE.bar - LESSON_TOP_MARGIN, right, band ? floor : height),
  };
}

function stacked({ width, height, formulas, controls, steps: wanted }: LayoutInput): ChromeLayout {
  const edge = EDGE.compact;
  const bandHeight = FORMULA_BAND_HEIGHT.compact;
  const top = STACKED.bar + (controls ? STACKED.controls : 0);
  const inner = width - 2 * edge;

  const stepsHeight = Math.round(
    Math.max(STACKED.minSteps, Math.min(height * STACKED.maxStepsShare, wanted)),
  );
  const steps = box(edge, height - edge - stepsHeight, inner, stepsHeight);
  const band = formulas ? box(edge, steps.y - edge - bandHeight, inner, bandHeight) : null;
  const floor = (band ?? steps).y - edge;
  return {
    mode: "stacked",
    compact: true,
    edge,
    steps,
    formulas: band,
    controls: { x: edge, y: STACKED.bar, width: inner },
    // Floating over everything, the rail may run the window's full height.
    railBottom: edge,
    figure: span(edge, top, width - edge, floor),
    canvas: span(0, STACKED.bar - LESSON_TOP_MARGIN, width, floor),
  };
}

function box(x: number, y: number, width: number, height: number): Box {
  return { x, y, width: Math.max(0, width), height: Math.max(0, height) };
}

/** The box between two corners. */
function span(left: number, top: number, right: number, bottom: number): Box {
  return box(left, top, right - left, bottom - top);
}
