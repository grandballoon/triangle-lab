// The curriculum rail: every chapter with its lessons and axioms, down the
// left edge of a lesson page, with the open lesson marked. The pager mounts
// it (pager.ts), so every lesson page carries it, and the pill that shows and
// hides it leads the pager row.
//
// On a wide screen the rail docks beside the figure. It publishes the room it
// takes as `--rail-inset` on <html> and fires `resize`; each page then fits
// its figure into what is left — the standalone pages through their #stage
// rule, the lab page in shell.ts. On a narrow screen it floats over the
// figure instead and publishes no inset.

import "./curriculum.css";
import { chapters, hrefOf, lessons, type Chapter, type Lesson } from "./lessons.ts";

const EDGE = 18;
const RAIL_WIDTH = 260;
const DOCK_QUERY = "(min-width: 960px)";
const STORAGE_KEY = "triangle-lab:curriculum";

let rail: HTMLElement | null = null;
let toggle: HTMLButtonElement | null = null;
let open = false;
let inset = 0;

/**
 * Build the rail on first call, mark the lesson with this slug as the open
 * one, and return a fresh pill for the pager that shows and hides the rail.
 */
export function mountCurriculum(slug: string): HTMLButtonElement {
  if (!rail) {
    rail = build();
    open = readStoredOpen() ?? dockable();
    media()?.addEventListener("change", apply);
  }
  if (!rail.isConnected) document.body.append(rail);
  mark(rail, slug);
  toggle = pill();
  apply();
  if (open) centreCurrent(rail);
  return toggle;
}

/** Width the docked rail takes from the left of the window, in CSS pixels. */
export function railInset(): number {
  return inset;
}

function setOpen(value: boolean, remember: boolean): void {
  open = value;
  if (remember) writeStoredOpen(value);
  apply();
  if (open && rail) centreCurrent(rail);
}

/** Bring the rail, the pill and the published inset in line with `open`. */
function apply(): void {
  if (!rail) return;
  const docked = dockable();
  rail.hidden = !open;
  rail.classList.toggle("floating", !docked);
  toggle?.setAttribute("aria-expanded", String(open));
  if (toggle) toggle.title = open ? "Hide curriculum" : "Show curriculum";

  const next = open && docked ? EDGE + RAIL_WIDTH : 0;
  if (next === inset) return;
  inset = next;
  document.documentElement.style.setProperty("--rail-inset", `${inset}px`);
  // The standalone pages size their figure on resize, and only then.
  window.dispatchEvent(new Event("resize"));
}

// --- Markup ------------------------------------------------------------------

function build(): HTMLElement {
  const el = document.createElement("nav");
  el.id = "curriculum";
  el.setAttribute("aria-label", "Curriculum");
  el.style.setProperty("--rail-width", `${RAIL_WIDTH}px`);

  const head = document.createElement("div");
  head.className = "cur-head";
  head.textContent = "Curriculum";

  const scroller = document.createElement("div");
  scroller.className = "cur-scroll";
  scroller.append(...chapters.filter((c) => c.lessons.length > 0).map(chapterGroup));

  // Floating, the rail covers the figure, so it steps aside once a lesson is
  // picked. Docked, it stays.
  el.addEventListener("click", (e) => {
    if (!dockable() && (e.target as Element).closest(".cur-lesson")) setOpen(false, false);
  });

  el.append(head, scroller);
  return el;
}

function chapterGroup(chapter: Chapter): HTMLDetailsElement {
  const list = document.createElement("ol");
  list.className = "cur-lessons";
  list.append(...chapter.lessons.map(lessonItem));

  const axioms = document.createElement("ul");
  axioms.append(...chapter.axioms.map((name) => text("li", "", name)));
  const axiomGroup = disclosure(
    [text("span", "", "Axioms"), text("span", "cur-count", String(chapter.axioms.length))],
    [axioms],
  );
  axiomGroup.className = "cur-axioms";

  const group = disclosure(
    [text("span", "cur-title", chapter.title), text("span", "cur-count", String(chapter.lessons.length))],
    [list, axiomGroup],
  );
  group.className = "cur-chapter";
  return group;
}

function lessonItem(lesson: Lesson): HTMLLIElement {
  const link = document.createElement("a");
  link.className = "cur-lesson";
  link.href = hrefOf(lesson);
  link.dataset.slug = lesson.slug;
  // Numbered through the whole course, as the pager counts.
  link.append(
    text("span", "cur-num", String(lessons.indexOf(lesson) + 1)),
    text("span", "cur-name", lesson.name),
  );
  const item = document.createElement("li");
  item.append(link);
  return item;
}

function pill(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-pill nav-rail";
  button.setAttribute("aria-controls", "curriculum");
  button.setAttribute("aria-label", "Curriculum");
  button.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">
    <rect x="1.5" y="2.5" width="13" height="11" rx="2" fill="none" stroke="currentColor" stroke-width="1.4" />
    <line x1="6" y1="2.5" x2="6" y2="13.5" stroke="currentColor" stroke-width="1.4" />
  </svg>`;
  button.addEventListener("click", () => setOpen(!open, true));
  return button;
}

/** Mark the open lesson, and unfold its chapter without folding any other. */
function mark(el: HTMLElement, slug: string): void {
  const current = lessons.find((l) => l.slug === slug);
  if (current) el.style.setProperty("--cur-accent", current.accent);
  for (const link of el.querySelectorAll<HTMLAnchorElement>(".cur-lesson")) {
    if (link.dataset.slug === slug) {
      link.setAttribute("aria-current", "page");
      link.closest<HTMLDetailsElement>(".cur-chapter")!.open = true;
    } else {
      link.removeAttribute("aria-current");
    }
  }
  for (const group of el.querySelectorAll(".cur-chapter")) {
    group.classList.toggle("current", group.querySelector("[aria-current]") !== null);
  }
}

/** Scroll the rail, and only the rail, to put the open lesson mid-way. */
function centreCurrent(el: HTMLElement): void {
  const scroller = el.querySelector<HTMLElement>(".cur-scroll")!;
  const link = el.querySelector<HTMLElement>("[aria-current]");
  if (!link) return;
  scroller.scrollTop = link.offsetTop - (scroller.clientHeight - link.offsetHeight) / 2;
}

function disclosure(label: HTMLElement[], body: HTMLElement[]): HTMLDetailsElement {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.append(...label);
  details.append(summary, ...body);
  return details;
}

function text<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, value: string): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  el.textContent = value;
  return el;
}

// --- Environment ---------------------------------------------------------------

function media(): MediaQueryList | null {
  return typeof matchMedia === "function" ? matchMedia(DOCK_QUERY) : null;
}

function dockable(): boolean {
  return media()?.matches ?? false;
}

function readStoredOpen(): boolean | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? null : stored === "open";
  } catch {
    return null;
  }
}

function writeStoredOpen(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? "open" : "closed");
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}
