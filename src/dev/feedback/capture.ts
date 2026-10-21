// Turns a clicked element into a FeedbackEntry: a selector that finds it
// again and a short description a reader can recognise it by.

import type { FeedbackEntry } from "./entry.ts";

/** Identifiers that are safe to drop into a selector unescaped. */
const plain = /^-?[A-Za-z_][\w-]*$/;

/** The element's own step in a selector: tag, id or a few classes, and position. */
function step(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const classes = [...el.classList].filter((c) => plain.test(c)).slice(0, 2);
  let part = tag + classes.map((c) => `.${c}`).join("");
  const parent = el.parentElement;
  if (parent) {
    const twins = [...parent.children].filter((c) => c.tagName === el.tagName);
    if (twins.length > 1) part += `:nth-of-type(${twins.indexOf(el) + 1})`;
  }
  return part;
}

/** A selector for `el`, anchored at the nearest ancestor with a unique id. */
export function selectorFor(el: Element): string {
  const doc = el.ownerDocument;
  const parts: string[] = [];
  for (let node: Element | null = el; node && node !== doc.body && node !== doc.documentElement; node = node.parentElement) {
    if (node.id && plain.test(node.id) && doc.querySelectorAll(`#${node.id}`).length === 1) {
      parts.unshift(`#${node.id}`);
      return parts.join(" > ");
    }
    parts.unshift(step(node));
  }
  return parts.join(" > ") || el.tagName.toLowerCase();
}

const TEXT_LIMIT = 60;

/** The opening tag with its identifying attributes, then the start of its text. */
export function describe(el: Element): string {
  const attrs = [...el.attributes]
    .filter((a) => a.name === "id" || a.name === "class" || a.name === "aria-label" || a.name.startsWith("data-"))
    .map((a) => ` ${a.name}="${a.value}"`)
    .join("");
  const tag = `<${el.tagName.toLowerCase()}${attrs}>`;
  const text = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (!text) return tag;
  return `${tag} "${text.length > TEXT_LIMIT ? `${text.slice(0, TEXT_LIMIT)}…` : text}"`;
}

/** Everything about a click on `el` at client point (x, y), plus the comment. */
export function capture(el: Element, x: number, y: number, comment: string): FeedbackEntry {
  const box = el.getBoundingClientRect();
  const win = el.ownerDocument.defaultView;
  const loc = el.ownerDocument.location;
  return {
    comment,
    page: loc.pathname + loc.search,
    selector: selectorFor(el),
    element: describe(el),
    point: { x: x - box.left, y: y - box.top },
    size: { width: box.width, height: box.height },
    viewport: { width: win?.innerWidth ?? 0, height: win?.innerHeight ?? 0 },
  };
}
