// Entry point of the lab page (lab.html): one page that hosts every lab
// lesson, picked by `?lesson=<slug>`. Moving between lab lessons swaps the
// lesson in place rather than loading a new page, so the camera stream and
// the hand-tracking model stay warm.

import "katex/dist/katex.min.css";
import "./lab.css";
import { startHands } from "../hands/index.ts";
import { railInset } from "../curriculum.ts";
import { chapters, hrefOf, lessons, slugOfLocation, type Lesson } from "../lessons.ts";
import { mountPager, type Neighbours } from "../pager.ts";
import { startWebcam } from "../webcam.ts";
import type { LessonBuilder } from "./scene.ts";
import { Shell } from "./shell.ts";

const modules = import.meta.glob<{ default: LessonBuilder }>("./lessons/*.ts");

const byId = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const video = byId<HTMLVideoElement>("cam");
const topbar = byId("topbar");

const hands = startHands({
  video,
  multiPointer: true,
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
    steps: byId("step-list"),
    leader: document.getElementById("leader") as unknown as SVGSVGElement,
  },
  () => hands.frames(),
  railInset,
);

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
  neighbours = mountPager(slug, topbar);
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
