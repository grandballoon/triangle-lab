// Builds the lesson menu from the shared reading order, so the order the cards
// appear in and the order the pager walks are the same list (lessons.ts).

import { lessons, type Lesson } from "./lessons.ts";

const grid = document.getElementById("grid") as HTMLElement;
grid.append(...lessons.map(card));

function card(lesson: Lesson): HTMLAnchorElement {
  const link = document.createElement("a");
  link.className = "card";
  link.href = `${lesson.slug}.html`;
  link.style.setProperty("--accent", lesson.accent);

  const icon = document.createElement("span");
  icon.className = "icon";
  // Icon markup is authored in lessons.ts, not user input. The copy below goes
  // through textContent, which keeps the ampersands and degree signs in the
  // lesson names literal.
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
