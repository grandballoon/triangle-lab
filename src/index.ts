// Builds the lesson menu from the shared reading order, so the order the cards
// appear in and the order the pager walks are the same list (lessons.ts).

import { chapters, hrefOf, type Chapter, type Lesson } from "./lessons.ts";
import { dueCards } from "./recall/deck.ts";
import { RecallStore } from "./recall/store.ts";

const shown = chapters.filter((c) => c.lessons.length > 0);

const menu = document.getElementById("menu") as HTMLElement;
menu.append(...shown.map(section));

// The margin lists each chapter's main results by name. Beside the menu it
// starts open; stacked under it on a narrow screen it starts folded, since
// it would otherwise run on for screens.
const margin = document.getElementById("axioms") as HTMLElement;
margin.append(
  disclosure("Axioms", shown.map(axiomGroup), !matchMedia("(max-width: 960px)").matches),
);

// The link to the recall page says how many noted questions are due, and
// keeps saying so as questions are noted or answered in other tabs.
const recallLink = document.getElementById("recall-link") as HTMLAnchorElement;
const recall = new RecallStore();
const showDue = (): void => {
  const deck = recall.get();
  const due = dueCards(deck, Date.now()).length;
  recallLink.replaceChildren("Recall your questions");
  if (due > 0) recallLink.append(field("due", `${due} due`));
  recallLink.title = deck.cards.length === 0 ? "Questions you note in a lesson are asked back here" : "";
};
recall.subscribe(showDue);
showDue();

function axiomGroup(chapter: Chapter): HTMLDetailsElement {
  const list = document.createElement("ul");
  list.append(
    ...chapter.axioms.map((name) => {
      const item = document.createElement("li");
      item.textContent = name;
      return item;
    }),
  );
  const group = disclosure(chapter.title, [list], true);
  group.className = "group";
  return group;
}

function disclosure(label: string, body: HTMLElement[], open: boolean): HTMLDetailsElement {
  const details = document.createElement("details");
  details.open = open;
  const summary = document.createElement("summary");
  summary.textContent = label;
  details.append(summary, ...body);
  return details;
}

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
