// Every file in src/images, the recommended images lessons show beside their
// uses, held to the checks in src/images/check.ts: a picture kind, a
// hyphenated lower-case name, and small enough for the page.

import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fileFaults } from "../src/images/check.ts";

const FOLDER = fileURLToPath(new URL("../src/images", import.meta.url));

describe("the recommended images folder", () => {
  it("holds only small, well-named pictures, beside its checks", () => {
    // Dotfiles, such as the .DS_Store Finder leaves, are never published.
    const pictures = readdirSync(FOLDER).filter((name) => !name.endsWith(".ts") && !name.startsWith("."));
    expect(pictures.length).toBeGreaterThan(0);
    expect(pictures.flatMap((name) => fileFaults(name, statSync(`${FOLDER}/${name}`).size))).toEqual([]);
  });
});
