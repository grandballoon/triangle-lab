// A sheet floating over a lesson, which the learner can drag aside by its
// header, fold down to the header, and size from its bottom-right corner, so
// the figure stays in view while they write. Where it goes is a frame.ts
// Box, remembered in local storage under the sheet's own key; until the
// learner takes hold of it, the sheet keeps its natural size where `place`
// puts it. The review beside a lesson (beside.ts) floats this way.

import { capturePointer, releasePointer } from "../pointer.ts";
import { fitBox, moveBox, parseBox, resizeBox, type Box, type Size } from "./frame.ts";

/** The parts of a floating sheet: the sheet, its header, what folds away, the fold button, and the corner it is sized by. */
export interface FloatParts {
  sheet: HTMLElement;
  bar: HTMLElement;
  body: HTMLElement;
  fold: HTMLButtonElement;
  grip: HTMLElement;
}

export interface Floating {
  /** Size and place the sheet again, as when its contents or the window change. */
  layout(): void;
  /** Unfold the sheet, as when it is opened afresh; the caller lays it out. */
  unfold(): void;
  readonly folded: boolean;
}

/**
 * Make `parts.sheet` float. `key` is where its box is kept; `place` says
 * where its top-left corner goes until it has one. `onUnfold` hears it
 * unfolded, to put the focus back in it.
 */
export function floatSheet(
  parts: FloatParts,
  key: string,
  place: () => { left: number; top: number },
  onUnfold: () => void = () => {},
): Floating {
  const { sheet, bar, body, fold, grip } = parts;
  const win = sheet.ownerDocument.defaultView!;
  /** The box the learner gave the sheet, as they left it; null for none yet. */
  let box: Box | null = readBox(win, key);
  let folded = false;

  const view = (): Size => ({ width: win.innerWidth, height: win.innerHeight });

  const layout = (): void => {
    if (sheet.hidden) return;
    sheet.classList.toggle("folded", folded);
    body.hidden = folded;
    fold.setAttribute("aria-expanded", String(!folded));
    fold.title = folded ? "Unfold" : "Fold away";
    fold.setAttribute("aria-label", fold.title);
    sheet.classList.toggle("boxed", box !== null);
    if (!box) {
      for (const prop of ["width", "height"] as const) sheet.style[prop] = "";
      const at = place();
      sheet.style.left = `${at.left}px`;
      sheet.style.top = `${at.top}px`;
      return;
    }
    // Folded, the sheet is only its header tall, and only that need fit.
    sheet.style.width = `${box.width}px`;
    sheet.style.height = folded ? "" : `${box.height}px`;
    const fitted = fitBox(box, view(), folded ? sheet.offsetHeight : box.height);
    sheet.style.left = `${fitted.left}px`;
    sheet.style.top = `${fitted.top}px`;
    sheet.style.width = `${fitted.width}px`;
    sheet.style.height = folded ? "" : `${fitted.height}px`;
  };

  /** The sheet's box as drawn now; folded, it keeps the height it unfolds to. */
  const drawnBox = (): Box => {
    const r = sheet.getBoundingClientRect();
    const fitted = box && fitBox(box, view(), folded ? r.height : box.height);
    return { left: r.left, top: r.top, width: r.width, height: fitted ? fitted.height : r.height };
  };

  /** Let `handle` reshape the sheet's box by dragging, and keep the result. */
  const dragging = (handle: HTMLElement, reshape: (from: Box, dx: number, dy: number) => Box): void => {
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || (e.target as Element).closest("button, a")) return;
      e.preventDefault();
      const from = drawnBox();
      const [x0, y0] = [e.clientX, e.clientY];
      capturePointer(handle, e);
      sheet.classList.add("dragging");
      const move = (m: PointerEvent): void => {
        if (m.pointerId !== e.pointerId) return;
        box = reshape(from, m.clientX - x0, m.clientY - y0);
        layout();
      };
      const end = (u: PointerEvent): void => {
        if (u.pointerId !== e.pointerId) return;
        releasePointer(handle, u);
        sheet.classList.remove("dragging");
        for (const type of ["pointerup", "pointercancel"] as const) handle.removeEventListener(type, end);
        handle.removeEventListener("pointermove", move);
        writeBox(win, key, box);
      };
      handle.addEventListener("pointermove", move);
      for (const type of ["pointerup", "pointercancel"] as const) handle.addEventListener(type, end);
    });
  };
  dragging(bar, (from, dx, dy) => moveBox(from, dx, dy, view(), folded ? sheet.offsetHeight : from.height));
  dragging(grip, (from, dx, dy) => resizeBox(from, dx, dy, view()));

  fold.addEventListener("click", () => {
    // Folding pins the sheet where it is, at the height it unfolds to.
    box ??= drawnBox();
    folded = !folded;
    layout();
    if (!folded) onUnfold();
  });

  win.addEventListener("resize", layout);
  return {
    layout,
    unfold: () => {
      folded = false;
    },
    get folded() {
      return folded;
    },
  };
}

function readBox(win: Window, key: string): Box | null {
  try {
    return parseBox(win.localStorage.getItem(key));
  } catch {
    return null;
  }
}

function writeBox(win: Window, key: string, box: Box | null): void {
  if (!box) return;
  try {
    win.localStorage.setItem(key, JSON.stringify(box));
  } catch {
    // Storage blocked: the sheet stays where it was put for this page only.
  }
}
