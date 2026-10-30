// The chrome of a standalone lesson page. Each lesson HTML loads this as a
// second module script, so the lesson's own entry point stays about geometry
// and never has to know where it sits in the course or how it is driven. It
// builds what the lab page has around its figure, so the two kinds of lesson
// read alike:
//
//   - the top bar: the pager, the camera switch (cameraSwitch.ts), then the
//     chapter and the lesson's name;
//   - the step column on the right, holding the lesson's written directions
//     (directions.ts);
//   - the formula band along the bottom, for a lesson with live formulas;
//   - hand input, as synthetic pointers (src/hands).
//
// The lesson and this file talk through chrome.ts: this sets the current
// step there, and reads the lesson's formulas from it.
//
// Where the column and the band go, and the room they leave the figure,
// comes from the layout both kinds of page share (lab/layout.ts): beside the
// figure on a wide screen, stacked under it on a phone. The box left for the
// canvas is published as `--stage-left`, `--stage-top`, `--stage-width` and
// `--stage-height`, which each page's #stage rule reads, and `resize` fires;
// the lesson refits its figure on the event.

import "katex/dist/katex.min.css";
import { mountCameraSwitch } from "./cameraSwitch.ts";
import { formulaRows, setStep } from "./chrome.ts";
import { railInset } from "./curriculum.ts";
import { directions } from "./directions.ts";
import { startHands } from "./hands/index.ts";
import { Arranger } from "./lab/arrange.ts";
import { FormulaBand } from "./lab/formulas.ts";
import { layoutChrome } from "./lab/layout.ts";
import { StepList } from "./lab/steps.ts";
import { chapters, hrefOf, lessons, slugOfLocation, stepOfHash } from "./lessons.ts";
import { mountPager, moveBy } from "./pager.ts";
import { mountBeside } from "./recall/beside.ts";
import { mountRecall } from "./recall/capture.ts";
import { camera } from "./webcam.ts";

function mount(): void {
  const slug = slugOfLocation(location);
  const lesson = lessons.find((l) => l.slug === slug);
  const chapter = chapters.find((c) => lesson && c.lessons.includes(lesson));
  const steps = directions[slug] ?? [];
  const root = document.documentElement.style;
  if (lesson) root.setProperty("--accent", lesson.accent);

  const topbar = element("header", "topbar");
  const heading = element("div", "heading");
  heading.append(element("span", "eyebrow", chapter?.title ?? ""), element("h1", "title", lesson?.name ?? ""));
  topbar.append(heading);
  document.body.append(topbar);
  const neighbours = mountPager(slug, topbar);
  mountCameraSwitch(topbar);

  const column = element("aside", "steps");
  column.setAttribute("aria-label", "Steps");
  const host = element("div", "step-list");
  column.append(host);
  document.body.append(column);

  let current = 0;
  // Questions noted here are asked from this lesson and the step on show.
  const recall = mountRecall(topbar, () =>
    lesson ? { lesson: slug, step: current, stepTitle: steps[current]?.title ?? "" } : null,
  );
  // A review sitting taken to the lesson, to check an answer here, beside it.
  mountBeside();
  const select = (step: number, scroll: boolean): void => {
    current = step;
    setStep(step);
    list.mark(step, scroll);
    // The question sheet can stay open as the steps change under it.
    recall.refresh();
  };
  const list = new StepList(host, select);
  list.show(steps, []);
  // A link may ask for a step (`#step-3`, as the recall page's do). Once
  // taken, the hash is dropped, so it never disagrees with the step shown.
  const start = stepOfHash(location.hash);
  if (start !== null) {
    if (start < steps.length) select(start, true);
    history.replaceState(history.state, "", location.pathname + location.search);
  }

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
    camera,
    onAction: (action) => {
      if (action === "next") go(1);
      else if (action === "previous") go(-1);
    },
  });

  const band = formulaRows() ? mountFormulaBand() : null;
  const arranger = new Arranger({ steps: column, formulas: band?.section });

  const fit = (): void => {
    const chrome = layoutChrome({
      width: window.innerWidth,
      height: window.innerHeight,
      rail: railInset(),
      formulas: band !== null,
      controls: false,
      steps: list.pagedHeight(),
    });
    list.setPaged(chrome.mode === "stacked");
    if (!arranger.apply(chrome)) return;
    // The band, or the stacked steps, take the bottom-left corner the hands
    // pill sits in otherwise, so the pill moves to the top right, as on the
    // lab page.
    document.body.classList.toggle("hands-top", band !== null || chrome.mode === "stacked");
    const { x, y, width, height } = chrome.canvas;
    root.setProperty("--stage-left", `${x}px`);
    root.setProperty("--stage-top", `${y}px`);
    root.setProperty("--stage-width", `${width}px`);
    root.setProperty("--stage-height", `${height}px`);
    // The lesson sizes its figure on resize, and only then. This listener
    // hears the event too, and finds nothing left to move.
    window.dispatchEvent(new Event("resize"));
  };
  window.addEventListener("resize", fit);
  fit();

  // Typeset text and web fonts settle after the first layout, so the padding
  // that lets the last step reach the top, and on a phone the height of the
  // paged steps, are kept up to date every frame, as the lab shell does.
  // The lesson's formulas are refreshed in the same frames.
  const pad = (): void => {
    fit();
    list.fit();
    band?.rows.show(formulaRows() ?? []);
    requestAnimationFrame(pad);
  };
  requestAnimationFrame(pad);
}

/** Build the formula band, for a lesson with live numbers. */
function mountFormulaBand(): { section: HTMLElement; rows: FormulaBand } {
  const section = element("section", "formulas");
  section.setAttribute("aria-label", "Formulas");
  const rows = element("div", "readouts");
  section.append(element("h2", "", "Formulas"), rows);
  document.body.append(section);
  return { section, rows: new FormulaBand(rows) };
}

function element(tag: string, id: string, text = ""): HTMLElement {
  const el = document.createElement(tag);
  if (id) el.id = id;
  el.textContent = text;
  return el;
}

mount();
