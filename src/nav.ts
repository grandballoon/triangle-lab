// The pager every lesson page carries: back to the menu, and a step to the
// previous or next lesson in reading order. Each lesson HTML loads this as a
// second module script, so the lesson's own entry point stays about geometry
// and never has to know where it sits in the reading order.
//
// The order comes from lessons.ts — the same list the menu renders from.

import "./nav.css";
import { indexOfSlug, lessons, type Lesson } from "./lessons.ts";

const slug = (location.pathname.split("/").pop() ?? "").replace(/\.html$/, "");
const at = indexOfSlug(slug);

// A page that isn't in the reading order (or a URL we can't read a slug from)
// gets no pager rather than a broken one.
if (at !== -1) {
  const prev: Lesson | undefined = at > 0 ? lessons[at - 1] : undefined;
  const next: Lesson | undefined = lessons[at + 1];

  document.body.append(buildNav(prev, next));

  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    let target: Lesson | undefined;
    if (e.key === "ArrowLeft") target = prev;
    else if (e.key === "ArrowRight") target = next;
    else return;
    if (target) location.href = href(target);
  });
}

function href(lesson: Lesson): string {
  return `${lesson.slug}.html`;
}

function buildNav(prev: Lesson | undefined, next: Lesson | undefined): HTMLElement {
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
  return nav;
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
  link.href = href(lesson);
  link.rel = rel;
  link.title = label;
  link.setAttribute("aria-label", label);
  link.textContent = glyph;
  return link;
}
