// Entry point of the lab page (lab.html): one page that hosts every lab
// lesson, picked by `?lesson=<slug>`. Moving between lab lessons swaps the
// lesson in place rather than loading a new page, so the camera stream and
// the hand-tracking model stay warm.

import "katex/dist/katex.min.css";
import "./lab.css";
import { mountCameraSwitch } from "../cameraSwitch.ts";
import { startHands } from "../hands/index.ts";
import { railInset } from "../curriculum.ts";
import { chapters, hrefOf, lessons, slugOfLocation, stepOfHash, type Lesson } from "../lessons.ts";
import { mountPager, type Neighbours } from "../pager.ts";
import { mountBeside } from "../recall/beside.ts";
import { mountRecall } from "../recall/capture.ts";
import { camera, startWebcam } from "../webcam.ts";
import type { LessonBuilder } from "./scene.ts";
import { Shell } from "./shell.ts";

const modules = import.meta.glob<{ default: LessonBuilder }>("./lessons/*.ts");

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const video = byId<HTMLVideoElement>("cam");
const topbar = byId("topbar");
mountCameraSwitch(topbar);

const hands = startHands({
  video,
  multiPointer: true,
  camera,
  onAction: (action) => {
    if (action === "next") shell.stepBy(1);
    else if (action === "previous") shell.stepBy(-1);
    else if (action === "reset") shell.reset();
    else shell.toggleFormulas();
  },
});

const shell = new Shell(
  {
    canvas: byId<HTMLCanvasElement>("stage"),
    eyebrow: byId("eyebrow"),
    title: byId("title"),
    controls: byId("controls"),
    formulas: byId("formulas"),
    readouts: byId("readouts"),
    column: byId("steps"),
    steps: byId("step-list"),
    leader: document.getElementById("leader") as unknown as SVGSVGElement,
  },
  () => hands.frames(),
  railInset,
  // The question sheet can stay open as the steps change under it.
  () => recall.refresh(),
);

// Questions noted here are asked from the lesson and step on show now.
const recall = mountRecall(topbar, () => {
  const at = shell.currentStep();
  const slug = slugOfLocation(location);
  return at && lessons.some((l) => l.slug === slug) ? { lesson: slug, step: at.step, stepTitle: at.title } : null;
});
// A review sitting taken to the lesson, to check an answer here, beside it.
mountBeside();

let neighbours: Neighbours = { prev: undefined, next: undefined };

async function show(slug: string): Promise<void> {
  const lesson = lessons.find((l) => l.slug === slug && l.lab);
  const load = modules[`./lessons/${slug}.ts`];
  if (!lesson || !load) {
    location.replace("index.html");
    return;
  }
  const { default: build } = await load();
  const chapter = chapters.find((c) => c.lessons.includes(lesson));
  shell.load({ eyebrow: chapter?.title ?? "", title: lesson.name, accent: lesson.accent }, build);
  // A link may ask for a step (`#step-3`, as the recall page's do). Once
  // taken, the hash is dropped, so it never disagrees with the step shown.
  const start = stepOfHash(location.hash);
  if (start !== null) {
    shell.goTo(start);
    history.replaceState(history.state, "", location.pathname + location.search);
  }
  neighbours = mountPager(slug, topbar);
  recall.refresh();
  document.title = `${lesson.name} · Triangle Lab`;
}

/** Go to a lesson: in place when it is a lab lesson, by page load otherwise. */
function go(lesson: Lesson): void {
  if (!lesson.lab) {
    location.href = hrefOf(lesson);
    return;
  }
  history.pushState(null, "", hrefOf(lesson));
  void show(lesson.slug);
}

// Links to lab lessons — the pager's and the curriculum rail's — stay on this
// page.
document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const link = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
  if (!link) return;
  const lesson = lessons.find((l) => l.slug === slugOfLocation(new URL(link.href)));
  if (!lesson?.lab) return;
  e.preventDefault();
  go(lesson);
});

window.addEventListener("popstate", () => void show(slugOfLocation(location)));

// Arrow keys walk the steps, and roll over into the neighbouring lesson at
// either end, so the whole course can be read with one key.
window.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.key === "ArrowRight") {
    if (!shell.stepBy(1) && neighbours.next) go(neighbours.next);
  } else if (e.key === "ArrowLeft") {
    if (!shell.stepBy(-1) && neighbours.prev) go(neighbours.prev);
  } else if (e.key === "r" || e.key === "R") {
    shell.reset();
  } else if (e.key === "f" || e.key === "F") {
    shell.toggleFormulas();
  }
});

void startWebcam(video);
void show(slugOfLocation(location));
