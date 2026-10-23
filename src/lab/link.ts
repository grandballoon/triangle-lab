// Links the mathematics a lesson writes to the figure it draws, without the
// lesson saying how. `linkTex` reads a LaTeX expression and marks each thing
// a figure could show as a term (scene.ts `term`): point and segment names
// (`A`, `AB`, `A'B'`, `O_1`), angles (`\angle PED`, `\angle B`), triangles
// and polygons (`\triangle ABC`, `ABCD`), variables (`a`, `\alpha`) and
// numbers (`5.2`, `37^\circ`). The term id says what to look for, and
// figure.ts finds where the figure drew it, so a term the figure does not
// show simply leads nowhere.
//
// A lesson's own `term(...)` marks are left as they are, and so is anything
// that is not mathematics a figure draws: text, exponents, colour names.

/** What a term found by `linkTex` refers to. Names and symbols are as the figure prints them (A′, O₁, α). */
export type TermRef =
  | { kind: "point"; name: string }
  | { kind: "segment"; names: [string, string] }
  /** One name (`∠B`) or three, vertex in the middle (`∠ABC`). */
  | { kind: "angle"; names: string[] }
  | { kind: "polygon"; names: string[] }
  | { kind: "symbol"; text: string }
  | { kind: "number"; text: string };

// Term ids are `kind:part.part…`; the parts never hold a dot, a comma or an
// equals sign, which KaTeX's `\htmlData` would misread.
const KIND_PREFIX = { point: "pt", segment: "seg", angle: "ang", polygon: "poly", symbol: "sym", number: "num" } as const;
const PREFIX_KIND = Object.fromEntries(Object.entries(KIND_PREFIX).map(([k, p]) => [p, k])) as Record<
  string,
  TermRef["kind"]
>;

export function termId(ref: TermRef): string {
  const parts =
    ref.kind === "point" ? [ref.name] : ref.kind === "symbol" || ref.kind === "number" ? [ref.text] : ref.names;
  return `${KIND_PREFIX[ref.kind]}:${parts.join(".")}`;
}

/** The reference a `linkTex` term id stands for; null for a lesson's own term ids. */
export function parseTermId(id: string): TermRef | null {
  const colon = id.indexOf(":");
  const kind = PREFIX_KIND[id.slice(0, colon)];
  if (colon < 0 || !kind) return null;
  const parts = id.slice(colon + 1).split(".");
  switch (kind) {
    case "point":
      return { kind, name: parts[0] };
    case "segment":
      return parts.length === 2 ? { kind, names: [parts[0], parts[1]] } : null;
    case "angle":
    case "polygon":
      return { kind, names: parts };
    case "symbol":
    case "number":
      return { kind, text: parts.join(".") };
  }
}

/** Greek letters (and ℓ) as LaTeX commands, with the characters figures label them by. π is a constant, not a mark. */
export const GREEK: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", zeta: "ζ", eta: "η",
  theta: "θ", vartheta: "θ", iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ", rho: "ρ",
  sigma: "σ", tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω", ell: "ℓ",
};

const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";

/**
 * Commands whose first arguments are not figure mathematics, with how many
 * to copy as they are: text, fonts for sets and units, colours, spacing,
 * environments, arcs, and terms already marked.
 */
const VERBATIM_ARGS: Record<string, number> = {
  text: 1, textrm: 1, textbf: 1, textit: 1, textsf: 1, mathrm: 1, mathbf: 1, mathbb: 1, mathcal: 1,
  mathsf: 1, mathit: 1, operatorname: 1, color: 1, textcolor: 1, htmlClass: 1, htmlData: 2, hspace: 1,
  kern: 1, mkern: 1, begin: 1, end: 1, widehat: 1, overparen: 1, overset: 2, stackrel: 2,
};

const FRACTIONS = new Set(["frac", "tfrac", "dfrac", "cfrac", "binom"]);

/**
 * Commands that, written straight after a number, make it a coefficient
 * (`2\alpha`, `3\sqrt2`) rather than a value the figure might print.
 */
const GLUING = new Set([...Object.keys(GREEK), "pi", "sqrt", "frac", "tfrac", "dfrac", "angle", "triangle", "overline", "sin", "cos", "tan", "sec", "csc", "cot", "log", "ln"]);

const isUpper = (c: string | undefined): boolean => c !== undefined && c >= "A" && c <= "Z";
const isLower = (c: string | undefined): boolean => c !== undefined && c >= "a" && c <= "z";
const isLetter = (c: string | undefined): boolean => isUpper(c) || isLower(c);
const isDigit = (c: string | undefined): boolean => c !== undefined && c >= "0" && c <= "9";

/**
 * The lesson's own terms in `tex` that stand for one thing `linkTex` would
 * also find, keyed by the id it would give: `term("alpha", "\\alpha")` makes
 * `sym:α` an alias of `alpha`, so an `\\alpha` in the step text leads to the
 * same marks as the one in the formula.
 */
export function termAliases(tex: string): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const [, id, body] of tex.matchAll(/\\htmlData\{term=([^},:]+)\}\{([^{}]*)\}/g)) {
    const auto = /^\\htmlData\{term=([^}]+)\}\{(.*)\}$/.exec(linkTex(body));
    if (auto && auto[2] === body) aliases.set(auto[1], id);
  }
  return aliases;
}

/** Mark everything in `tex` a figure might show as a term. */
export function linkTex(tex: string): string {
  return new Linker(tex).run();
}

/** A letter's primes and digit subscript as LaTeX, read from `at`. */
interface Decoration {
  end: number;
  /** As the figure prints it: ′ per prime, subscript digits. */
  text: string;
  /** False when the subscript is something other than digits (`h_a`). */
  plain: boolean;
}

class Linker {
  private i = 0;
  private out = "";

  constructor(private readonly s: string) {}

  run(): string {
    const { s } = this;
    while (this.i < s.length) {
      const c = s[this.i];
      if (c === "\\") this.command();
      else if (c === "^" || c === "_") this.copy(this.argEnd(this.i + 1));
      else if (isDigit(c)) this.number();
      else if (isUpper(c)) this.names();
      else if (isLower(c)) this.symbol(c, this.i + 1);
      else this.copy(this.i + 1);
    }
    return this.out;
  }

  private copy(end: number): void {
    this.out += this.s.slice(this.i, end);
    this.i = end;
  }

  private wrap(ref: TermRef, end: number): void {
    this.out += `\\htmlData{term=${termId(ref)}}{${this.s.slice(this.i, end)}}`;
    this.i = end;
  }

  /** The command at `at` — its letters, or the one symbol after the backslash — and where it ends. */
  private commandAt(at: number): { name: string; end: number } {
    let end = at + 1;
    while (isLetter(this.s[end])) end++;
    if (end === at + 1) end++;
    return { name: this.s.slice(at + 1, end), end };
  }

  private skipSpaces(at: number): number {
    while (this.s[at] === " ") at++;
    return at;
  }

  /** The end of the argument starting at `at` (after spaces): a braced group, a command, or one character. */
  private argEnd(at: number): number {
    const { s } = this;
    at = this.skipSpaces(at);
    if (s[at] === "\\") return this.commandAt(at).end;
    if (s[at] !== "{") return Math.min(s.length, at + 1);
    let depth = 0;
    for (let j = at; j < s.length; j++) {
      if (s[j] === "\\") j++;
      else if (s[j] === "{") depth++;
      else if (s[j] === "}" && --depth === 0) return j + 1;
    }
    return s.length;
  }

  private command(): void {
    const { s } = this;
    const { name, end } = this.commandAt(this.i);
    const verbatim = VERBATIM_ARGS[name];
    if (verbatim !== undefined) {
      let at = end;
      for (let n = 0; n < verbatim; n++) at = this.argEnd(at);
      this.copy(at);
    } else if (FRACTIONS.has(name)) {
      this.fraction(end);
    } else if (name === "angle" || name === "triangle") {
      const at = this.skipSpaces(end);
      const run = this.nameRun(at);
      const fits = name === "angle" ? run.names.length === 1 || run.names.length === 3 : run.names.length >= 3;
      if (run.plain && fits) {
        this.wrap(name === "angle" ? { kind: "angle", names: run.names } : { kind: "polygon", names: run.names }, run.end);
      } else {
        this.copy(end);
      }
    } else if (GREEK[name] && s[end] !== "{") {
      const d = this.decoration(end);
      if (d.plain) this.wrap({ kind: "symbol", text: GREEK[name] + d.text }, d.end);
      else this.copy(d.end);
    } else if (isLetter(s[this.i + 1]) && isDigit(s[end])) {
      // `\sqrt2`, `\tfrac12`-style digits are the command's arguments, not values.
      let at = end;
      while (isDigit(s[at])) at++;
      this.copy(at);
    } else {
      this.copy(end);
    }
  }

  /** A fraction's arguments: plain digits (`\frac{1}{2}`) are a constant; anything else is linked inside. */
  private fraction(end: number): void {
    this.copy(end);
    for (let n = 0; n < 2; n++) {
      const start = this.skipSpaces(this.i);
      const stop = this.argEnd(start);
      const arg = this.s.slice(start, stop);
      if (arg.startsWith("{") && !/^\{\s*\d+\s*\}$/.test(arg)) {
        this.out += this.s.slice(this.i, start) + "{" + linkTex(arg.slice(1, -1)) + "}";
        this.i = stop;
      } else {
        this.copy(stop);
      }
    }
  }

  private number(): void {
    const { s } = this;
    const start = this.i;
    let at = start;
    while (isDigit(s[at])) at++;
    if (s[at] === "." && isDigit(s[at + 1])) {
      at++;
      while (isDigit(s[at])) at++;
    }
    const text = s.slice(start, at);
    const degrees = /^(\^\\circ|\^\{\\circ\})/.exec(s.slice(at));
    const end = degrees ? at + degrees[0].length : at;
    const next = s[end];
    const glued =
      isLetter(s[start - 1]) ||
      isLetter(next) ||
      next === "(" ||
      (!degrees && next === "^") ||
      (next === "\\" && GLUING.has(this.commandAt(end).name));
    if (glued) this.copy(end);
    else this.wrap({ kind: "number", text }, end);
  }

  /** Capital letters run together: a point, a segment, or a polygon's corners. */
  private names(): void {
    const run = this.nameRun(this.i);
    if (!run.plain || isLower(this.s[run.end])) return this.copy(run.end);
    const { names } = run;
    const ref: TermRef =
      names.length === 1
        ? { kind: "point", name: names[0] }
        : names.length === 2
          ? { kind: "segment", names: [names[0], names[1]] }
          : { kind: "polygon", names };
    this.wrap(ref, run.end);
  }

  private nameRun(at: number): { names: string[]; end: number; plain: boolean } {
    const names: string[] = [];
    let plain = true;
    while (isUpper(this.s[at])) {
      const d = this.decoration(at + 1);
      names.push(this.s[at] + d.text);
      plain &&= d.plain;
      at = d.end;
    }
    return { names, end: at, plain };
  }

  /** One lower-case variable. */
  private symbol(letter: string, after: number): void {
    const d = this.decoration(after);
    if (d.plain) this.wrap({ kind: "symbol", text: letter + d.text }, d.end);
    else this.copy(d.end);
  }

  private decoration(at: number): Decoration {
    const { s } = this;
    let text = "";
    while (s[at] === "'") {
      text += "′";
      at++;
    }
    if (s[at] !== "_") return { end: at, text, plain: true };
    const end = this.argEnd(at + 1);
    const sub = s.slice(at + 1, end).replace(/^\s*\{?|\}?$/g, "");
    if (!/^\d+$/.test(sub)) return { end, text, plain: false };
    return { end, text: text + [...sub].map((d) => SUBSCRIPT_DIGITS[Number(d)]).join(""), plain: true };
  }
}
