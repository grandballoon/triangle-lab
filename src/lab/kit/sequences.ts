// Shared pieces for the Sequences and Series lessons: numbers and lists of
// terms written for canvas labels, where TeX is not available.

import { fmt } from "../geo.ts";

const SUBSCRIPTS = "₀₁₂₃₄₅₆₇₈₉";

/** A whole number as subscript characters: 10 is "₁₀". */
export const sub = (n: number): string => [...String(Math.round(n))].map((ch) => SUBSCRIPTS[Number(ch)] ?? ch).join("");

/** A number for a label, with a true minus sign. */
export const num = (v: number, digits = 3): string => fmt(v, digits).replace("-", "−");

/** A list of terms as text, cut short with an ellipsis past `most` of them. */
export function listText(terms: readonly number[], most = 6, join = ", "): string {
  const shown = terms.length > most ? [...terms.slice(0, most - 1), NaN, terms[terms.length - 1]] : terms;
  return shown.map((t) => (Number.isNaN(t) ? "…" : num(t))).join(join);
}

/** The first `n` terms of the sequence that starts at `a` and follows `next`. */
export function sequence(a: number, next: (term: number) => number, n: number): number[] {
  const out = [a];
  while (out.length < n) out.push(next(out[out.length - 1]));
  return out.slice(0, n);
}
