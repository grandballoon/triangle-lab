// Builds the lesson menu from the shared reading order, so the order the cards
// appear in and the order the pager walks are the same list (lessons.ts).

import { chapters, hrefOf, type Chapter, type Lesson } from "./lessons.ts";

const menu = document.getElementById("menu") as HTMLElement;
menu.append(...chapters.filter((c) => c.lessons.length > 0).map(section));

function section(chapter: Chapter): HTMLElement {
  const el = document.createElement("section");
  el.className = "chapter";

  const title = document.createElement("h2");
  title.textContent = chapter.title;
  const blurb = document.createElement("p");
  blurb.className = "blurb";
  blurb.textContent = chapter.blurb;

  const grid = document.createElement("div");
  grid.className = "grid";
  grid.append(...chapter.lessons.map(card));

  el.append(title, blurb, grid);
  return el;
}

function card(lesson: Lesson): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "card";
  link.href = hrefOf(lesson);
  link.style.setProperty("--accent", lesson.accent);

  const icon = document.createElement("span");
  icon.className = "icon";
  // Icon markup is authored in the chapter files, not user input. The copy
  // below goes through textContent, which keeps the ampersands and degree
  // signs in the lesson names literal.
  icon.innerHTML = `<svg viewBox="0 0 32 32">${lesson.icon}</svg>`;

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.append(
    field("part", lesson.part),
    field("name", lesson.name),
    field("desc", lesson.desc),
  );

  link.append(icon, meta);
  return link;
}

function field(cls: string, text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.className = cls;
  span.textContent = text;
  return span;
}
