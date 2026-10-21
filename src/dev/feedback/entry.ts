// One UI comment, as the overlay sends it and the dev server records it.
// Shared by both sides of the wire, so it stays free of DOM and Node APIs.

/** Where the overlay posts comments; served by tools/feedback-plugin.ts. */
export const FEEDBACK_ENDPOINT = "/__ui-feedback";

export interface Size {
  width: number;
  height: number;
}

export interface FeedbackEntry {
  /** What the reviewer wrote. */
  comment: string;
  /** Path and query of the page, e.g. `/lab.html?lesson=box-diagonal`. */
  page: string;
  /** A CSS selector that finds the element again. */
  selector: string;
  /** The element's opening tag and the start of its text. */
  element: string;
  /** Where the click landed, in CSS pixels from the element's top left. */
  point: { x: number; y: number };
  /** The element's box, in CSS pixels. */
  size: Size;
  viewport: Size;
}

const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isSize = (v: unknown): v is Size =>
  typeof v === "object" && v !== null && isNumber((v as Size).width) && isNumber((v as Size).height);

/** Accept a decoded request body only if it is a complete entry. */
export function parseEntry(value: unknown): FeedbackEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const e = value as Record<string, unknown>;
  const point = e.point as { x?: unknown; y?: unknown } | null;
  const ok =
    isString(e.comment) && e.comment.trim() !== "" &&
    isString(e.page) && isString(e.selector) && isString(e.element) &&
    typeof point === "object" && point !== null && isNumber(point.x) && isNumber(point.y) &&
    isSize(e.size) && isSize(e.viewport);
  if (!ok) return null;
  return {
    comment: (e.comment as string).trim(),
    page: e.page as string,
    selector: e.selector as string,
    element: e.element as string,
    point: { x: point.x as number, y: point.y as number },
    size: e.size as Size,
    viewport: e.viewport as Size,
  };
}

/** The top of a fresh feedback file, explaining its format to whoever reads it. */
export const FEEDBACK_HEADER = `# UI feedback

Comments left on the running dev server with Alt-click.
Each entry starts open (\`[ ]\`) and is marked \`[x]\` once it has been dealt with.
This file is local and gitignored.
`;

const pad = (n: number) => String(n).padStart(2, "0");
const px = (s: Size) => `${Math.round(s.width)} × ${Math.round(s.height)} px`;

/** One entry as a Markdown section, stamped with local time `at`. */
export function formatEntry(entry: FeedbackEntry, at: Date): string {
  const stamp =
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ` +
    `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const quote = entry.comment.split(/\r?\n/).map((line) => `> ${line}`.trimEnd()).join("\n");
  const { x, y } = entry.point;
  return `
## [ ] ${stamp} · ${entry.page}

${quote}

- Element: \`${entry.element}\`
- Selector: \`${entry.selector}\`
- Clicked at: ${Math.round(x)}, ${Math.round(y)} px inside a ${px(entry.size)} box
- Viewport: ${px(entry.viewport)}
`;
}
