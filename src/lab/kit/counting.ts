// Counting for the Learning to Count lessons: factorials, ordered and
// unordered choices, rows of Pascal's triangle, and the orderings and
// subsets of a short list, in the order a reader would write them down.

/** n! = n · (n − 1) · … · 1, with 0! = 1. */
export function factorial(n: number): number {
  let out = 1;
  for (let k = 2; k <= n; k++) out *= k;
  return out;
}

/** The ordered choices of r things from n: n · (n − 1) · … · (n − r + 1). */
export function arrangements(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  let out = 1;
  for (let k = 0; k < r; k++) out *= n - k;
  return out;
}

/** n choose r, the unordered choices of r things from n. */
export function choose(n: number, r: number): number {
  if (r < 0 || r > n) return 0;
  const k = Math.min(r, n - r);
  let out = 1;
  for (let i = 1; i <= k; i++) out = (out * (n - k + i)) / i;
  return Math.round(out);
}

/** Row n of Pascal's triangle: n choose 0, n choose 1, …, n choose n. */
export const pascalRow = (n: number): number[] => Array.from({ length: n + 1 }, (_, k) => choose(n, k));

/** The orderings of `items`, in dictionary order of their positions. */
export function orderings<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((first, i) =>
    orderings([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [first, ...rest]),
  );
}

/** The idx-th ordering of `items` in that same order, counting from 0, without listing the others. */
export function ordering<T>(items: readonly T[], idx: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  let rest = idx;
  for (let n = pool.length; n > 0; n--) {
    const f = factorial(n - 1);
    const i = Math.floor(rest / f) % n;
    rest %= f;
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

/** The r-element subsets of `items`, each in the order the items come. */
export function subsets<T>(items: readonly T[], r: number): T[][] {
  if (r === 0) return [[]];
  if (items.length < r) return [];
  const [first, ...rest] = items;
  return [...subsets(rest, r - 1).map((s) => [first, ...s]), ...subsets(rest, r)];
}

/** A whole number with its thousands set apart by thin spaces, for figure labels: 17 576 000. */
export const big = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** The same for TeX: 17{,}576{,}000. */
export const texBig = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "{,}");
