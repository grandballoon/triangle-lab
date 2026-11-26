// Every file in src/images, the recommended images lessons show beside their
// uses, held to the checks in src/images/check.ts: a picture kind, a
// hyphenated lower-case name, small enough for the page, and shown by a
// lesson.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fileFaults, unusedPictures } from "../src/images/check.ts";

const SRC = fileURLToPath(new URL("../src", import.meta.url));
const FOLDER = `${SRC}/images`;

/** The pictures kept here. Dotfiles, such as the .DS_Store Finder leaves, are never published. */
const pictures = (): string[] => readdirSync(FOLDER).filter((name) => !name.endsWith(".ts") && !name.startsWith("."));

describe("the recommended images folder", () => {
  it("holds only small, well-named pictures, beside its checks", () => {
    const names = pictures();
    expect(names.length).toBeGreaterThan(0);
    expect(names.flatMap((name) => fileFaults(name, statSync(`${FOLDER}/${name}`).size))).toEqual([]);
  });

  it("holds only pictures a lesson imports", () => {
    const modules = readdirSync(SRC, { recursive: true, encoding: "utf8" }).filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"));
    const sources = modules.map((path) => readFileSync(`${SRC}/${path}`, "utf8"));
    expect(unusedPictures(pictures(), sources)).toEqual([]);
  });
});
