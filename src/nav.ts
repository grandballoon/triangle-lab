// The pager on a standalone lesson page. Each lesson HTML loads this as a
// second module script, so the lesson's own entry point stays about geometry
// and never has to know where it sits in the reading order.

import { hrefOf, slugOfLocation, type Lesson } from "./lessons.ts";
import { mountPager } from "./pager.ts";

const { prev, next } = mountPager(slugOfLocation(location));

window.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  let target: Lesson | undefined;
  if (e.key === "ArrowLeft") target = prev;
  else if (e.key === "ArrowRight") target = next;
  else return;
  if (target) location.href = hrefOf(target);
});
