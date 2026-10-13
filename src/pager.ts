// The pager every lesson carries: back to the menu, and a step to the previous
// or next lesson in reading order. The order comes from lessons.ts — the same
// list the menu renders from.
//
// Standalone lesson pages mount it through nav.ts; the lab page mounts it
// itself and re-mounts as it swaps lessons in place.

import "./nav.css";
import { hrefOf, indexOfSlug, lessons, type Lesson } from "./lessons.ts";

export interface Neighbours {
  prev: Lesson | undefined;
  next: Lesson | undefined;
}

/**
 * Build (or rebuild) the pager for the lesson with this slug and return its
 * neighbours. A slug that is not in the reading order gets no pager rather
 * than a broken one.
 */
export function mountPager(slug: string, host: HTMLElement = document.body): Neighbours {
  document.getElementById("nav")?.remove();
  const at = indexOfSlug(slug);
  if (at === -1) return { prev: undefined, next: undefined };

  const prev: Lesson | undefined = at > 0 ? lessons[at - 1] : undefined;
  const next: Lesson | undefined = lessons[at + 1];

  const nav = document.createElement("nav");
  nav.id = "nav";
  nav.setAttribute("aria-label", "Lesson navigation");

  const back = document.createElement("a");
  back.className = "nav-pill";
  back.href = "index.html";
  back.textContent = "← Lessons";

  const step = document.createElement("span");
  step.className = "nav-pill nav-step";
  step.textContent = `${at + 1} / ${lessons.length}`;

  nav.append(back, arrow(prev, "‹", "prev"), step, arrow(next, "›", "next"));
  host.prepend(nav);
  return { prev, next };
}

/** One end of the pager. Without a lesson to point at we still render the
 *  arrow, dimmed and inert, to hold the row's shape. */
function arrow(lesson: Lesson | undefined, glyph: string, rel: "prev" | "next"): HTMLElement {
  if (!lesson) {
    const dead = document.createElement("span");
    dead.className = "nav-pill nav-arrow";
    dead.setAttribute("aria-disabled", "true");
    dead.textContent = glyph;
    return dead;
  }

  const label = `${rel === "prev" ? "Previous" : "Next"}: ${lesson.name}`;
  const link = document.createElement("a");
  link.className = "nav-pill nav-arrow";
  link.href = hrefOf(lesson);
  link.rel = rel;
  link.title = label;
  link.setAttribute("aria-label", label);
  link.textContent = glyph;
  return link;
}
