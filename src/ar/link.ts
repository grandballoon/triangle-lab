// The pill in the lab page's top bar that opens the lesson on show in AR
// (ar.html), shown only for the lessons that page takes (lessons.ts).

import { arHrefOf, hasAr } from "./lessons.ts";

/** Add the pill to the end of the top bar; call the result with each lesson shown. */
export function mountArLink(topbar: HTMLElement): (slug: string) => void {
  const link = document.createElement("a");
  link.className = "nav-pill nav-ar";
  link.textContent = "View in AR";
  link.title = "Place this figure in the room around you";
  link.hidden = true;
  topbar.append(link);
  return (slug) => {
    link.hidden = !hasAr(slug);
    link.href = arHrefOf(slug);
  };
}
