// Reading the project's .dev.vars as wrangler does.

import { describe, expect, it } from "vitest";
import { devVar } from "./dev-vars.ts";

describe("devVar", () => {
  it("reads a value as wrangler does, quoted or not, past comments and other names", () => {
    const text = "# the Claude key\nOTHER=1\nANTHROPIC_API_KEY=abc+/=\r\n";
    expect(devVar(text, "ANTHROPIC_API_KEY")).toBe("abc+/=");
    expect(devVar(`ANTHROPIC_API_KEY="a b"`, "ANTHROPIC_API_KEY")).toBe("a b");
    expect(devVar("ANTHROPIC_API_KEY = 'x' ", "ANTHROPIC_API_KEY")).toBe("x");
    expect(devVar("export ANTHROPIC_API_KEY=y", "ANTHROPIC_API_KEY")).toBe("y");
  });

  it("is null for a name the file does not give", () => {
    expect(devVar("ANTHROPIC_API_KEYS=no\n# ANTHROPIC_API_KEY=no", "ANTHROPIC_API_KEY")).toBeNull();
    expect(devVar("", "ANTHROPIC_API_KEY")).toBeNull();
  });
});
