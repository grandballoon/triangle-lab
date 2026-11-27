// The pieces of a use both its lesson's Uses tab (lab/steps.ts) and the
// gallery (uses/page.ts) draw: its topics, each a link to the gallery's list
// of that topic, and its recommended picture with its caption.

import "./markup.css";
import type { UseImage } from "../lab/scene.ts";
import { topicOf, sortTags, type Topic } from "./topics.ts";

/** The gallery of every lesson's uses, open at `topic`, or at every topic for null. */
export function galleryHref(topic: Topic | null): string {
  return topic ? `uses.html?topic=${topic}` : "uses.html";
}

/** A use's topics as a row of small links, in the order of TOPICS. */
export function topicChips(doc: Document, tags: readonly Topic[]): HTMLElement {
  const row = doc.createElement("ul");
  row.className = "topic-chips";
  row.setAttribute("aria-label", "Topics");
  for (const id of sortTags(tags)) {
    const item = doc.createElement("li");
    const link = doc.createElement("a");
    link.className = "topic-chip";
    link.href = galleryHref(id);
    link.textContent = topicOf(id)?.label ?? id;
    link.title = "Every use in this topic";
    item.append(link);
    row.append(item);
  }
  return row;
}

/** A use's recommended picture and its caption, loaded as it nears the screen. */
export function useFigure(doc: Document, image: UseImage): HTMLElement {
  const figure = doc.createElement("figure");
  figure.className = "aside-figure";
  const img = doc.createElement("img");
  img.src = image.src;
  img.alt = image.alt ?? "";
  img.setAttribute("loading", "lazy");
  img.setAttribute("decoding", "async");
  const caption = doc.createElement("figcaption");
  caption.textContent = image.caption;
  figure.append(img, caption);
  return figure;
}
