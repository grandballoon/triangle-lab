import { describe, expect, it } from "vitest";
import { digits, divisors, euclid, factorize, gcd, isPrime, lcm, mod, texFactors } from "./integers.ts";

describe("integers", () => {
  it("keeps remainders between 0 and m − 1", () => {
    expect(mod(17, 12)).toBe(5);
    expect(mod(-1, 12)).toBe(11);
    expect(mod(24, 12)).toBe(0);
  });

  it("lists divisors in order", () => {
    expect(divisors(1)).toEqual([1]);
    expect(divisors(12)).toEqual([1, 2, 3, 4, 6, 12]);
    expect(divisors(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
  });

  it("finds primes and factorizations", () => {
    expect([1, 2, 3, 4, 97, 91].map(isPrime)).toEqual([false, true, true, false, true, false]);
    expect(factorize(60)).toEqual([[2, 2], [3, 1], [5, 1]]);
    expect(texFactors(64)).toBe("2^{6}");
    expect(texFactors(1)).toBe("1");
  });

  it("finds greatest common divisors and least common multiples", () => {
    expect(gcd(12, 18)).toBe(6);
    expect(lcm(12, 18)).toBe(36);
    expect(gcd(13, 17)).toBe(1);
    expect(euclid(18, 12)).toEqual([[18, 12, 1, 6], [12, 6, 2, 0]]);
  });

  it("writes numbers in other bases", () => {
    expect(digits(13, 2)).toEqual([1, 1, 0, 1]);
    expect(digits(0, 5)).toEqual([0]);
    expect(digits(255, 16)).toEqual([15, 15]);
    expect(digits(3725, 60)).toEqual([1, 2, 5]);
  });
});
