// @vitest-environment jsdom
//
// The UI feedback overlay's two pure halves: finding and describing a clicked
// element, and the entry format the dev server writes.

import { beforeEach, describe as group, expect, it } from "vitest";
import { capture, describe, selectorFor } from "./capture.ts";
import { formatEntry, parseEntry, type FeedbackEntry } from "./entry.ts";

group("selectorFor", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="menu">
        <section class="chapter open"><a class="card">One</a><a class="card">Two</a></section>
      </main>
      <div class="loose"><p>Plain</p></div>
      <i id="twin"></i><i id="twin"></i>`;
  });

  it("anchors at the nearest unique id and finds the element again", () => {
    const second = document.querySelectorAll("a")[1];
    const selector = selectorFor(second);
    expect(selector).toBe("#menu > section.chapter.open > a.card:nth-of-type(2)");
    expect(document.querySelector(selector)).toBe(second);
  });

  it("walks to the body when no ancestor has an id", () => {
    const p = document.querySelector("p")!;
    expect(document.querySelector(selectorFor(p))).toBe(p);
  });

  it("ignores ids that are not unique", () => {
    const twin = document.querySelectorAll("i")[1];
    expect(selectorFor(twin)).not.toContain("#twin");
    expect(document.querySelector(selectorFor(twin))).toBe(twin);
  });
});

group("describe", () => {
  it("shows identifying attributes and the start of the text", () => {
    document.body.innerHTML = `<button id="next" class="step" data-dir="1" title="x">Next   step</button>`;
    expect(describe(document.querySelector("button")!)).toBe(
      `<button id="next" class="step" data-dir="1"> "Next step"`,
    );
  });

  it("truncates long text", () => {
    document.body.innerHTML = `<p>${"a".repeat(100)}</p>`;
    expect(describe(document.querySelector("p")!)).toBe(`<p> "${"a".repeat(60)}…"`);
  });
});

it("capture measures the click from the element's corner", () => {
  document.body.innerHTML = `<canvas id="stage"></canvas>`;
  const canvas = document.querySelector("canvas")!;
  canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 300, height: 200 }) as DOMRect;
  const entry = capture(canvas, 110, 70, "Label overlaps the vertex");
  expect(entry).toMatchObject({
    comment: "Label overlaps the vertex",
    selector: "#stage",
    point: { x: 100, y: 50 },
    size: { width: 300, height: 200 },
  });
  expect(parseEntry(JSON.parse(JSON.stringify(entry)))).toEqual(entry);
});

const entry: FeedbackEntry = {
  comment: "  Too close to the edge.\nShift it right.  ",
  page: "/lab.html?lesson=box-diagonal",
  selector: "#stage",
  element: `<canvas id="stage">`,
  point: { x: 12.4, y: 30.6 },
  size: { width: 800, height: 600 },
  viewport: { width: 1440, height: 900 },
};

group("parseEntry", () => {
  it("trims the comment", () => {
    expect(parseEntry(entry)?.comment).toBe("Too close to the edge.\nShift it right.");
  });

  it("rejects incomplete or empty entries", () => {
    expect(parseEntry(null)).toBeNull();
    expect(parseEntry({ ...entry, comment: "   " })).toBeNull();
    expect(parseEntry({ ...entry, point: { x: 1 } })).toBeNull();
    expect(parseEntry({ ...entry, size: { width: Infinity, height: 1 } })).toBeNull();
  });
});

it("formatEntry writes an open, quoted Markdown section", () => {
  const text = formatEntry(parseEntry(entry)!, new Date(2026, 9, 21, 9, 5));
  expect(text).toBe(`
## [ ] 2026-10-21 09:05 · /lab.html?lesson=box-diagonal

> Too close to the edge.
> Shift it right.

- Element: \`<canvas id="stage">\`
- Selector: \`#stage\`
- Clicked at: 12, 31 px inside a 800 × 600 px box
- Viewport: 1440 × 900 px
`);
});
