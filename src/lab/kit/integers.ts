// Whole-number arithmetic for the Using the Integers lessons: divisors,
// primes and factorizations, greatest common divisors and least common
// multiples, remainders that are never negative, and digits in any base.

/** The remainder of a on division by m, from 0 up to m − 1 even when a is negative. */
export const mod = (a: number, m: number): number => ((a % m) + m) % m;

/** The divisors of n ≥ 1, smallest first. */
export function divisors(n: number): number[] {
  const small: number[] = [];
  const large: number[] = [];
  for (let d = 1; d * d <= n; d++) {
    if (n % d !== 0) continue;
    small.push(d);
    if (d * d !== n) large.unshift(n / d);
  }
  return [...small, ...large];
}

export const isPrime = (n: number): boolean => n >= 2 && divisors(n).length === 2;

/** The smallest prime factor of n ≥ 2. */
export function smallestFactor(n: number): number {
  for (let p = 2; p * p <= n; p++) if (n % p === 0) return p;
  return n;
}

/** n ≥ 2 as prime powers, smallest prime first: 12 is [[2, 2], [3, 1]]. */
export function factorize(n: number): [number, number][] {
  const out: [number, number][] = [];
  let m = n;
  while (m > 1) {
    const p = smallestFactor(m);
    let e = 0;
    while (m % p === 0) {
      m /= p;
      e++;
    }
    out.push([p, e]);
  }
  return out;
}

/** A factorization for TeX: 2^{2} \cdot 3. One is written 1. */
export function texFactors(n: number): string {
  if (n === 1) return "1";
  return factorize(n)
    .map(([p, e]) => (e === 1 ? `${p}` : `${p}^{${e}}`))
    .join(" \\cdot ");
}

export function gcd(a: number, b: number): number {
  let [x, y] = [Math.abs(a), Math.abs(b)];
  while (y) [x, y] = [y, x % y];
  return x;
}

export const lcm = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : Math.abs(a * b) / gcd(a, b));

/** The steps of Euclid's algorithm on a and b: each [big, small, quotient, remainder], ending at remainder 0. */
export function euclid(a: number, b: number): [number, number, number, number][] {
  const steps: [number, number, number, number][] = [];
  let [x, y] = [Math.max(a, b), Math.min(a, b)];
  while (y > 0) {
    const q = Math.floor(x / y);
    steps.push([x, y, q, x - q * y]);
    [x, y] = [y, x - q * y];
  }
  return steps;
}

/** The digits of n ≥ 0 in base b, most significant first: 13 in base 2 is [1, 1, 0, 1]. */
export function digits(n: number, b: number): number[] {
  if (n === 0) return [0];
  const out: number[] = [];
  for (let m = n; m > 0; m = Math.floor(m / b)) out.unshift(m % b);
  return out;
}
