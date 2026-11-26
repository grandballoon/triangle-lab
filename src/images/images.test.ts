// The checks every lesson's recommended pictures, and every file kept for
// one, are held to. The folder itself is held to them in tools/images.test.ts,
// which can read the disk.

import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES, fileFaults, imageFaults } from "./check.ts";

describe("imageFaults", () => {
  it("finds nothing wrong with a picture that has a source and a plain caption", () => {
    expect(imageFaults({ src: "/assets/truss.jpg", caption: "A roof truss." })).toEqual([]);
    expect(imageFaults({ src: "/assets/truss.jpg", caption: "A roof truss.", alt: "Timber triangles under a roof." })).toEqual([]);
  });

  it("asks for a source, a caption without LaTeX, and an alt that says something", () => {
    expect(imageFaults({ src: " ", caption: "" })).toEqual(["it has no src", "it has no caption"]);
    expect(imageFaults({ src: "a.jpg", caption: "At $30^\\circ$", alt: "" })).toEqual([
      "its caption is plain text, without LaTeX",
      "its alt is empty; leave it out instead",
    ]);
  });
});

describe("fileFaults", () => {
  it("takes small pictures named in hyphenated lower-case words", () => {
    expect(fileFaults("roof-truss.jpg", 200 * 1024)).toEqual([]);
    expect(fileFaults("placeholder.svg", 600)).toEqual([]);
    expect(fileFaults("ramp-2.webp", MAX_IMAGE_BYTES)).toEqual([]);
  });

  it("refuses other kinds of file, other names, and large files", () => {
    expect(fileFaults("notes.txt", 10)).toEqual(["notes.txt is not one of jpg, jpeg, png, webp, avif, svg (lower-case extension)"]);
    expect(fileFaults("Roof Truss.JPG", 10)).toEqual([
      "Roof Truss.JPG is not one of jpg, jpeg, png, webp, avif, svg (lower-case extension)",
      "Roof Truss.JPG is not named in lower-case words joined by hyphens",
    ]);
    expect(fileFaults("truss.jpg", 2 * 1024 * 1024)).toEqual(["truss.jpg is 2048 KB, over 400 KB: resize it to about 1200 pixels across"]);
  });
});
