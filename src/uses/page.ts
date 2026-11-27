// The gallery of every lesson's uses (uses.html): their pictures, by topic,
// and a viewer that walks one topic's pictures in sequence.
//
// The uses are the lessons' own, gathered as each lesson gives them: a lab
// lesson is built against a Scene, which is DOM-free, and its view read for
// its uses; a standalone page's come from asides.ts. Grouping, picking a
// topic from the address and stepping through a sequence are pure
// (topics.ts); this module loads the lessons and draws.

import "katex/dist/katex.min.css";
import "./gallery.css";
import { asides } from "../asides.ts";
import { Scene, type LessonBuilder, type Use } from "../lab/scene.ts";
import { richHtml } from "../lab/math.ts";
import { chapters, hrefOf, lessons, type Lesson } from "../lessons.ts";
import { galleryHref, topicChips } from "./markup.ts";
import { byTopic, isTopic, pickGroups, placeAll, stepIn, type Placed, type TopicGroup } from "./topics.ts";

const modules = import.meta.glob<{ default: LessonBuilder }>("../lab/lessons/*.ts");

type Group = TopicGroup<Use>;

const nav = document.getElementById("topics") as HTMLElement;
const gallery = document.getElementById("gallery") as HTMLElement;
const viewer = document.getElementById("viewer") as HTMLDialogElement;

/** A lab lesson's uses, from its view, or undefined when it does not load. */
async function labUses(lesson: Lesson): Promise<readonly Use[] | undefined> {
  const load = modules[`../lab/lessons/${lesson.slug}.ts`];
  if (!load) return undefined;
  try {
    const build = (await load()).default;
    return build(new Scene(lesson.accent)).uses;
  } catch (error) {
    console.error(`The uses of ${lesson.slug} could not be read`, error);
    return undefined;
  }
}

async function gather(): Promise<Placed<Use>[]> {
  const found = new Map<string, readonly Use[] | undefined>();
  await Promise.all(
    lessons.map(async (lesson) => found.set(lesson.slug, lesson.lab ? await labUses(lesson) : asides[lesson.slug]?.uses)),
  );
  return placeAll(chapters, (slug) => found.get(slug));
}

const topicOfAddress = (): string | null => new URLSearchParams(location.search).get("topic");

const accentOf = new Map(lessons.map((l) => [l.slug, l.accent]));
/** Every topic's pictures, once the lessons are gathered. */
let groups: Group[] = [];

gallery.textContent = "Gathering the pictures…";
void gather().then((placed) => {
  groups = byTopic(placed, (use) => use.image !== undefined);
  // A topic asked for that has no pictures shows every topic; say so in the address too.
  const asked = topicOfAddress();
  if (asked !== null && !(isTopic(asked) && groups.some((g) => g.topic.id === asked))) {
    history.replaceState(null, "", galleryHref(null));
  }
  render();
  window.addEventListener("popstate", render);
});

/** Draw the topics row and the topics the address asks for. */
function render(): void {
  const asked = topicOfAddress();
  const shown = pickGroups(groups, asked);
  const current = shown.length === 1 && groups.length > 1 ? shown[0].topic.id : null;
  nav.replaceChildren(topicRow(current));
  gallery.replaceChildren(...shown.map(section));
  document.title = current ? `${shown[0].topic.label} · Uses · Triangle Lab` : "Uses · Triangle Lab";
  if (viewer.open) viewer.close();
}

/** Every topic as a link, with how many pictures it has; the one shown marked. */
function topicRow(current: string | null): HTMLElement {
  const list = document.createElement("ul");
  list.className = "ug-topics";
  const total = new Set(groups.flatMap((g) => g.uses.map((p) => p.use))).size;
  const item = (label: string, count: number, topic: Group["topic"]["id"] | null): HTMLElement => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = galleryHref(topic);
    a.append(label, countOf(count));
    if (topic === current) a.setAttribute("aria-current", "page");
    a.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      history.pushState(null, "", a.href);
      render();
      window.scrollTo({ top: 0 });
    });
    li.append(a);
    return li;
  };
  list.append(item("All", total, null), ...groups.map((g) => item(g.topic.label, g.uses.length, g.topic.id)));
  return list;
}

function countOf(n: number): HTMLElement {
  const span = document.createElement("span");
  span.className = "ug-count";
  span.textContent = String(n);
  return span;
}

/** One topic: its name, what it covers, and a card for each of its pictures. */
function section(group: Group): HTMLElement {
  const el = document.createElement("section");
  el.className = "ug-topic";
  el.id = group.topic.id;
  const head = document.createElement("h2");
  head.textContent = group.topic.label;
  const blurb = document.createElement("p");
  blurb.className = "ug-blurb";
  blurb.textContent = group.topic.blurb;
  const grid = document.createElement("div");
  grid.className = "ug-grid";
  grid.append(...group.uses.map((placed, i) => card(group, placed, i)));
  el.append(head, blurb, grid);
  return el;
}

function card(group: Group, placed: Placed<Use>, index: number): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "ug-card";
  button.style.setProperty("--accent", accentOf.get(placed.slug) ?? "#38d9a9");
  const img = document.createElement("img");
  img.src = placed.use.image!.src;
  img.alt = "";
  img.setAttribute("loading", "lazy");
  img.setAttribute("decoding", "async");
  const title = document.createElement("span");
  title.className = "ug-card-title";
  title.textContent = placed.use.title;
  const where = document.createElement("span");
  where.className = "ug-card-where";
  where.textContent = `${placed.chapter} · ${placed.lesson}`;
  button.append(img, title, where);
  button.addEventListener("click", () => open(group, index));
  return button;
}

/** The viewer's place: the topic it walks and the picture on show. */
let at: { group: Group; index: number } | null = null;

function open(group: Group, index: number): void {
  at = { group, index };
  drawViewer();
  if (!viewer.open) viewer.showModal();
}

function step(delta: number): void {
  if (!at) return;
  at = { group: at.group, index: stepIn(at.index, at.group.uses.length, delta) };
  drawViewer();
}

function drawViewer(): void {
  if (!at) return;
  const { group, index } = at;
  const placed = group.uses[index];
  const { use } = placed;
  const lesson = lessons.find((l) => l.slug === placed.slug);
  viewer.style.setProperty("--accent", accentOf.get(placed.slug) ?? "#38d9a9");

  const bar = document.createElement("div");
  bar.className = "ug-viewer-bar";
  const where = document.createElement("span");
  where.className = "ug-viewer-count";
  where.textContent = `${group.topic.label} · ${index + 1} of ${group.uses.length}`;
  const close = button("×", "Close", () => viewer.close());
  close.classList.add("ug-close");
  bar.append(where, close);

  const figure = document.createElement("figure");
  figure.className = "ug-viewer-figure";
  const img = document.createElement("img");
  img.src = use.image!.src;
  img.alt = use.image!.alt ?? "";
  const prev = button("‹", "Previous picture", () => step(-1));
  const next = button("›", "Next picture", () => step(1));
  prev.classList.add("ug-turn", "ug-prev");
  next.classList.add("ug-turn", "ug-next");
  const single = group.uses.length < 2;
  prev.hidden = next.hidden = single;
  figure.append(img, prev, next);

  const body = document.createElement("div");
  body.className = "ug-viewer-body";
  const title = document.createElement("h2");
  title.textContent = use.title;
  const caption = document.createElement("p");
  caption.className = "ug-viewer-caption";
  caption.textContent = use.image!.caption;
  const text = document.createElement("p");
  text.className = "ug-viewer-text";
  text.innerHTML = richHtml(use.text);
  const foot = document.createElement("div");
  foot.className = "ug-viewer-foot";
  if (lesson) {
    const link = document.createElement("a");
    link.className = "ug-lesson";
    link.href = hrefOf(lesson);
    link.textContent = `Open ${placed.lesson}`;
    foot.append(link);
  }
  body.append(title, topicChips(document, use.tags), caption, text, foot);

  viewer.replaceChildren(bar, figure, body);
}

function button(glyph: string, label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = glyph;
  b.setAttribute("aria-label", label);
  b.addEventListener("click", onClick);
  return b;
}

viewer.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") step(1);
  else if (e.key === "ArrowLeft") step(-1);
  else return;
  e.preventDefault();
});

// A press on the backdrop, outside the sheet, closes it.
viewer.addEventListener("click", (e) => {
  if (e.target === viewer) viewer.close();
});

// A horizontal swipe across the picture turns it, as on a phone's photos.
let swipe: { id: number; x: number; y: number } | null = null;
viewer.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse" && (e.target as Element).closest(".ug-viewer-figure")) swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
});
viewer.addEventListener("pointerup", (e) => {
  if (!swipe || e.pointerId !== swipe.id) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  swipe = null;
  if (Math.abs(dx) > 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
});
viewer.addEventListener("pointercancel", () => (swipe = null));
