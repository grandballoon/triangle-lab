// Keeps the formula band still while the figure is being dragged. Numbers
// that change under a drag would otherwise flicker every frame; instead each
// one keeps the value it had when the drag began and is greyed out, and when
// the drag ends the new values come in and fade back to full strength.
//
// Pure: `present` takes the last state, whether a drag is under way and the
// readouts the lesson gives now, and returns what to show and the next state.
// The marks are classes (`held`, `held-new`, `settled`) that lab.css styles.

import type { Readout } from "./scene.ts";

/** Which numbers of a row are held: by position, or the whole row once its shape changed. */
type Held = { kind: "numbers"; old: ReadonlySet<number>; recent: ReadonlySet<number> } | { kind: "row" };

export type Hold =
  /** Showing the lesson's readouts as they are; `shown` is the last of them. */
  | { mode: "live"; shown: readonly Readout[] }
  /** A drag is under way: show `base` with the held numbers greyed. */
  | { mode: "holding"; base: readonly Readout[]; held: readonly Held[] }
  /** The drag ended on `settled`: show it, its new numbers fading in, until it changes. */
  | { mode: "settling"; settled: readonly Readout[]; held: readonly Held[] };

export const liveHold: Hold = { mode: "live", shown: [] };

export function present(
  hold: Hold,
  editing: boolean,
  live: readonly Readout[],
): { hold: Hold; rows: readonly Readout[] } {
  if (editing) {
    const base = hold.mode === "holding" ? hold.base : hold.mode === "settling" ? hold.settled : hold.shown;
    const held = base.map((row, i) => holdRow(hold.mode === "holding" ? hold.held[i] : undefined, row, live[i]));
    const rows = live.map((row, i) => (base[i] ? heldRow(base[i], held[i]) : row));
    return { hold: { mode: "holding", base, held }, rows };
  }
  if (hold.mode === "holding" || (hold.mode === "settling" && sameRows(hold.settled, live))) {
    const held = hold.held;
    return {
      hold: { mode: "settling", settled: live, held },
      rows: live.map((row, i) => (held[i] ? settledRow(row, held[i]) : row)),
    };
  }
  return { hold: { mode: "live", shown: live }, rows: live };
}

/** The held numbers of a row once the lesson says `now`, given what was held before. */
function holdRow(before: Held | undefined, base: Readout, now: Readout | undefined): Held {
  const prior = before ?? { kind: "numbers", old: new Set<number>(), recent: new Set<number>() };
  // A row's marks change only when something new is held, so a row is not
  // typeset afresh each frame and a number already greying is not started over.
  if (prior.kind === "row") return prior;
  const was = splitNumbers(base.tex);
  const is = now ? splitNumbers(now.tex) : null;
  const sameShape =
    is !== null &&
    now?.label === base.label &&
    (now?.tone ?? "plain") === (base.tone ?? "plain") &&
    is.text.length === was.text.length &&
    is.text.every((part, i) => part === was.text[i]);
  if (!sameShape) return { kind: "row" };

  const all = new Set([...prior.old, ...prior.recent]);
  const added = was.numbers.map((n, i) => (n !== is.numbers[i] && !all.has(i) ? i : -1)).filter((i) => i >= 0);
  if (added.length === 0) return prior;
  return { kind: "numbers", old: all, recent: new Set(added) };
}

function heldRow(base: Readout, held: Held): Readout {
  if (held.kind === "row") return { ...base, tex: mark(base.tex, "held held-new") };
  return {
    ...base,
    tex: markNumbers(base.tex, (i) =>
      held.recent.has(i) ? "held held-new" : held.old.has(i) ? "held" : null,
    ),
  };
}

function settledRow(row: Readout, held: Held): Readout {
  if (held.kind === "row") return { ...row, tex: mark(row.tex, "settled") };
  return { ...row, tex: markNumbers(row.tex, (i) => (held.recent.has(i) || held.old.has(i) ? "settled" : null)) };
}

const mark = (tex: string, classes: string): string => `\\htmlClass{${classes}}{${tex}}`;

function markNumbers(tex: string, classesFor: (i: number) => string | null): string {
  const { text, numbers } = splitNumbers(tex);
  return text
    .map((part, i) => {
      if (i === numbers.length) return part;
      const classes = classesFor(i);
      return part + (classes ? mark(numbers[i], classes) : numbers[i]);
    })
    .join("");
}

/**
 * A formula cut at its numbers, each with its degree sign: `text` holds the
 * pieces between them, one more than there are numbers. Digits inside a
 * command's name or a `\htmlData` term id are not numbers.
 */
export function splitNumbers(tex: string): { text: string[]; numbers: string[] } {
  const text: string[] = [];
  const numbers: string[] = [];
  let last = 0;
  for (const m of tex.matchAll(/\\htmlData\{[^}]*\}|\\[a-zA-Z]+|\d+(?:\.\d+)?(?:\^\\circ|\^\{\\circ\})?/g)) {
    if (m[0].startsWith("\\")) continue;
    text.push(tex.slice(last, m.index));
    numbers.push(m[0]);
    last = m.index + m[0].length;
  }
  text.push(tex.slice(last));
  return { text, numbers };
}

function sameRows(a: readonly Readout[], b: readonly Readout[]): boolean {
  return (
    a.length === b.length &&
    a.every((r, i) => r.tex === b[i].tex && r.label === b[i].label && (r.tone ?? "plain") === (b[i].tone ?? "plain"))
  );
}
