// Arranging the background photo: moving it and resizing it to line it up
// with the figure. While it is open, a layer over the whole page takes every
// pointer, so a drag moves the photo rather than the figure, and a bar along
// the bottom holds the size buttons and the way out.
//
//   - one pointer drags the photo; two pinch it, about the point between them;
//   - the wheel, or a trackpad's pinch, resizes it about the pointer;
//   - −, + and Fit in the bar, or the arrow keys, + − and 0, do it by hand;
//   - Replace picks another photo, Remove goes back to the camera, and Done,
//     Escape or Enter close the bar.
//
// Every one of these is decided in core.ts; this file only hears the events
// and hands the new placement to the page (index.ts), which draws and keeps
// it. The bar is built from buttons only, so a hand can work it.

import { capturePointer, releasePointer } from "../pointer.ts";
import {
  COVER,
  ZOOM_STEP,
  keyAction,
  moveBy,
  percent,
  pinch,
  wheelFactor,
  zoomAbout,
  zoomBy,
  type Placement,
  type Point,
  type Size,
} from "./core.ts";

/** What arranging needs from the page. */
export interface ArrangeHost {
  placement(): Placement;
  place(placement: Placement): void;
  /** The photo's own size, in pixels. */
  photoSize(): Size;
  replace(): void;
  remove(): void;
}

export class PhotoArranger {
  private readonly layer: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly size: HTMLSpanElement;
  /** Where each pointer on the layer was last. */
  private readonly pointers = new Map<number, Point>();

  constructor(
    doc: Document,
    private readonly host: ArrangeHost,
  ) {
    this.layer = doc.createElement("div");
    this.layer.id = "photo-arrange";
    this.layer.hidden = true;

    this.bar = doc.createElement("div");
    this.bar.id = "photo-bar";
    this.bar.hidden = true;
    this.bar.setAttribute("role", "toolbar");
    this.bar.setAttribute("aria-label", "Arrange the background photo");

    const hint = doc.createElement("div");
    hint.className = "photo-hint";
    hint.textContent = "Drag the photo to move it · scroll or pinch to resize";

    this.size = doc.createElement("span");
    this.size.className = "photo-size";
    this.size.setAttribute("aria-live", "polite");

    const button = (text: string, label: string, act: () => void, cls = ""): HTMLButtonElement => {
      const b = doc.createElement("button");
      b.type = "button";
      b.className = `photo-chip ${cls}`.trim();
      b.textContent = text;
      b.title = label;
      b.setAttribute("aria-label", label);
      b.addEventListener("click", act);
      return b;
    };
    const zoom = (factor: number) => () => this.set(zoomBy(this.at(), factor, host.photoSize(), this.window()));

    const sizing = doc.createElement("div");
    sizing.className = "photo-sizing";
    sizing.append(
      button("−", "Smaller", zoom(1 / ZOOM_STEP), "photo-step"),
      this.size,
      button("+", "Larger", zoom(ZOOM_STEP), "photo-step"),
    );
    const row = doc.createElement("div");
    row.className = "photo-row";
    row.append(
      sizing,
      button("Fit", "Fit the photo to the window", () => this.set(COVER)),
      button("Replace", "Use another photo", () => host.replace()),
      button("Remove", "Remove the photo, back to the camera", () => {
        this.close();
        host.remove();
      }),
      button("Done", "Done arranging", () => this.close(), "photo-done"),
    );
    this.bar.append(hint, row);
    doc.body.append(this.layer, this.bar);

    this.listen(doc);
  }

  get isOpen(): boolean {
    return !this.bar.hidden;
  }

  open(): void {
    this.layer.hidden = false;
    this.bar.hidden = false;
    this.refresh();
  }

  close(): void {
    this.layer.hidden = true;
    this.bar.hidden = true;
    this.pointers.clear();
  }

  /** Show the size of the placement now, as after a new photo. */
  refresh(): void {
    this.size.textContent = percent(this.at());
  }

  private at(): Placement {
    return this.host.placement();
  }

  private set(placement: Placement): void {
    this.host.place(placement);
    this.refresh();
  }

  private window(): Size {
    const view = this.layer.ownerDocument.defaultView;
    return { width: view?.innerWidth ?? 0, height: view?.innerHeight ?? 0 };
  }

  private listen(doc: Document): void {
    const layer = this.layer;
    layer.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      capturePointer(layer, e);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      layer.classList.add("grabbing");
    });
    layer.addEventListener("pointermove", (e) => {
      const was = this.pointers.get(e.pointerId);
      if (!was) return;
      const now = { x: e.clientX, y: e.clientY };
      const other = [...this.pointers].find(([id]) => id !== e.pointerId)?.[1];
      this.pointers.set(e.pointerId, now);
      const photo = this.host.photoSize();
      const window = this.window();
      this.set(
        other
          ? pinch(this.at(), was, now, other, photo, window)
          : moveBy(this.at(), { x: now.x - was.x, y: now.y - was.y }, photo, window),
      );
    });
    const lift = (e: PointerEvent): void => {
      releasePointer(layer, e);
      this.pointers.delete(e.pointerId);
      if (this.pointers.size === 0) layer.classList.remove("grabbing");
    };
    layer.addEventListener("pointerup", lift);
    layer.addEventListener("pointercancel", lift);

    layer.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const about = { x: e.clientX, y: e.clientY };
        this.set(zoomAbout(this.at(), wheelFactor(e.deltaY, e.deltaMode), about, this.host.photoSize(), this.window()));
      },
      { passive: false },
    );

    // Heard before the lesson's own keys, which it keeps from them: an arrow
    // moves the photo here rather than the lesson's step.
    doc.defaultView?.addEventListener(
      "keydown",
      (e) => {
        if (!this.isOpen || e.altKey || e.ctrlKey || e.metaKey) return;
        // Enter on one of the bar's buttons presses it.
        if (e.key === "Enter" && this.bar.contains(e.target as Node)) return;
        const action = keyAction(e.key, e.shiftKey);
        if (!action) return;
        e.preventDefault();
        e.stopPropagation();
        if (action.kind === "done") this.close();
        else if (action.kind === "fit") this.set(COVER);
        else if (action.kind === "zoom") this.set(zoomBy(this.at(), action.factor, this.host.photoSize(), this.window()));
        else this.set(moveBy(this.at(), action.by, this.host.photoSize(), this.window()));
      },
      { capture: true },
    );
  }
}
