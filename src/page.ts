// The chrome of a standalone lesson page. Each lesson HTML loads this as a
// second module script, so the lesson's own entry point stays about geometry
// and never has to know where it sits in the course or how it is driven. It
// builds what the lab page has around its figure, so the two kinds of lesson
// read alike:
//
//   - the top bar: the pager, then the chapter and the lesson's name;
//   - the step column on the right, holding the lesson's written directions
//     (directions.ts);
//   - hand input, as synthetic pointers (src/hands).
//
// The step column takes room from the right of the window. Like the docked
// curriculum rail (curriculum.ts), it publishes that room as a custom
// property, `--steps-inset`, and fires `resize`; each page's #stage rule
// leaves it free and the lesson refits its figure on the event.

import "katex/dist/katex.min.css";
import { directions } from "./directions.ts";
import { startHands } from "./hands/index.ts";
import { panelWidth, StepList } from "./lab/steps.ts";
import { chapters, hrefOf, lessons, slugOfLocation } from "./lessons.ts";
import { mountPager, moveBy } from "./pager.ts";

const EDGE = 18;

function mount(): void {
  const slug = slugOfLocation(location);
  const lesson = lessons.find((l) => l.slug === slug);
  const chapter = chapters.find((c) => lesson && c.lessons.includes(lesson));
  const steps = directions[slug] ?? [];
  const root = document.documentElement.style;
  root.setProperty("--edge", `${EDGE}px`);
  if (lesson) root.setProperty("--accent", lesson.accent);

  const topbar = element("header", "topbar");
  const heading = element("div", "heading");
  heading.append(element("span", "eyebrow", chapter?.title ?? ""), element("h1", "title", lesson?.name ?? ""));
  topbar.append(heading);
  document.body.append(topbar);
  const neighbours = mountPager(slug, topbar);

  const column = element("aside", "steps");
  column.setAttribute("aria-label", "Steps");
  const host = element("div", "step-list");
  column.append(host);
  document.body.append(column);

  let current = 0;
  const select = (step: number, scroll: boolean): void => {
    current = step;
    list.mark(step, scroll);
  };
  const list = new StepList(host, select);
  list.show(steps, []);

  const go = (delta: -1 | 1): void => {
    const move = moveBy(current, steps.length, delta, neighbours);
    if (move?.kind === "step") select(move.step, true);
    else if (move?.kind === "lesson") location.href = hrefOf(move.lesson);
  };

  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  });

  // These pages are each built around a single drag, so one hand presses at
  // a time. The step gestures walk the directions; there is nothing to reset
  // and no formula band to show or hide.
  startHands({
    video: document.getElementById("cam") as HTMLVideoElement,
    multiPointer: false,
    onAction: (action) => {
      if (action === "next") go(1);
      else if (action === "previous") go(-1);
    },
  });

  let inset = -1;
  const fit = (): void => {
    const width = panelWidth(window.innerWidth);
    root.setProperty("--panel-width", `${width}px`);
    const next = width + 2 * EDGE;
    if (next !== inset) {
      inset = next;
      root.setProperty("--steps-inset", `${inset}px`);
      // The lesson sizes its figure on resize, and only then.
      window.dispatchEvent(new Event("resize"));
    }
  };
  window.addEventListener("resize", fit);
  fit();

  // Typeset text and web fonts settle after the first layout, so the padding
  // that lets the last step reach the top is kept up to date every frame, as
  // the lab shell does.
  const pad = (): void => {
    list.fit();
    requestAnimationFrame(pad);
  };
  requestAnimationFrame(pad);
}

function element(tag: string, id: string, text = ""): HTMLElement {
  const el = document.createElement(tag);
  el.id = id;
  el.textContent = text;
  return el;
}

mount();
