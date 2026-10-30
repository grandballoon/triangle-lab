// A photo behind the figure, in place of the camera's picture: dropped onto
// the page, pasted, or picked with the pill in the top bar. Once a photo
// shows, the pill arranges it instead (arrange.ts): moves and resizes it to
// line it up with the figure, picks another, or takes it away, back to the
// camera.
//
// The photo lies over the camera's <video> and under the veil, and leaves the
// camera itself alone: hand tracking still reads it, and it is still turned
// on and off from the hands settings sheet. A photo is never mirrored. Made
// smaller than the window, it sits on the page's plain dark background.
//
// The photo and where it was placed are remembered (store.ts), as the
// camera's choice is (webcam.ts), so the next lesson page opens over it too.
//
// Both kinds of lesson page mount it: page.ts for a standalone lesson, the
// lab page's main.ts for a lab lesson. The decisions are in core.ts.

import "./backdrop.css";
import { PhotoArranger } from "./arrange.ts";
import { COVER, carriesFiles, firstImage, photoBox, pillLabel, type Placement, type Size } from "./core.ts";
import { idbStore, type PhotoStore, type Saved } from "./store.ts";

export type { PhotoStore } from "./store.ts";

/** How long the placement settles before it is kept, so a drag is saved once. */
const SAVE_DELAY = 300;

// A framed landscape: a sun over two hills.
const ICON = `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.6" />
  <circle cx="10.6" cy="6" r="1.2" />
  <path d="M1.8 11.4l3.6-3.8 3.4 3.4 1.8-1.8 3.6 3.4" />
</svg>`;

/** The photo on show: its file, its object URL, its own size and where it sits. */
interface Shown {
  photo: Blob;
  url: string;
  size: Size;
  placement: Placement;
}

/**
 * Add the pill to the top bar, before the lesson's heading, and the photo
 * over `video`, and show the remembered photo, if any.
 */
export function mountBackdrop(topbar: HTMLElement, video: HTMLVideoElement, store: PhotoStore = idbStore()): void {
  const doc = topbar.ownerDocument;
  const view = doc.defaultView!;

  const frame = doc.createElement("div");
  frame.id = "photo";
  frame.hidden = true;
  const image = doc.createElement("img");
  image.alt = "";
  frame.append(image);
  video.after(frame);

  const pill = doc.createElement("button");
  pill.type = "button";
  pill.className = "nav-pill nav-photo";
  pill.innerHTML = ICON;
  topbar.insertBefore(pill, topbar.querySelector("#heading"));

  const picker = doc.createElement("input");
  picker.type = "file";
  picker.accept = "image/*";
  picker.hidden = true;
  doc.body.append(picker);

  const hint = doc.createElement("div");
  hint.id = "photo-drop";
  hint.hidden = true;
  hint.textContent = "Drop a photo to put it behind the figure";
  doc.body.append(hint);

  let shown: Shown | null = null;
  // Each photo asked for takes a number, so one that decodes after a later
  // one was asked for is dropped rather than shown over it.
  let asked = 0;
  let saving: ReturnType<typeof setTimeout> | undefined;

  const render = (): void => {
    frame.hidden = !shown;
    const label = pillLabel(shown !== null);
    pill.title = label;
    pill.setAttribute("aria-label", label);
    pill.setAttribute("aria-pressed", String(shown !== null));
    if (!shown) return;
    const box = photoBox(shown.size, { width: view.innerWidth, height: view.innerHeight }, shown.placement);
    image.style.left = `${box.left}px`;
    image.style.top = `${box.top}px`;
    image.style.width = `${box.width}px`;
    image.style.height = `${box.height}px`;
  };

  const keep = (saved: Saved | null): void => {
    clearTimeout(saving);
    void store.save(saved);
  };

  /** Show this photo where it was placed, or none. False when it would not decode. */
  const show = async (saved: Saved | null): Promise<boolean> => {
    const ticket = ++asked;
    let next: Shown | null = null;
    if (saved) {
      const url = URL.createObjectURL(saved.photo);
      const decoded = new Image();
      decoded.src = url;
      try {
        await decoded.decode();
      } catch {
        // Not an image this browser can draw (a HEIC photo, say).
        URL.revokeObjectURL(url);
        return false;
      }
      const size = { width: decoded.naturalWidth, height: decoded.naturalHeight };
      next = { ...saved, url, size };
    }
    if (ticket !== asked) {
      if (next) URL.revokeObjectURL(next.url);
      return false;
    }
    if (shown) URL.revokeObjectURL(shown.url);
    shown = next;
    if (next) image.src = next.url;
    else image.removeAttribute("src");
    render();
    arranger.refresh();
    return true;
  };

  /** Show a new photo, covering the window, or none, and keep it. */
  const use = async (photo: Blob | null): Promise<void> => {
    const saved = photo ? { photo, placement: COVER } : null;
    if (await show(saved)) keep(saved);
  };

  const arranger = new PhotoArranger(doc, {
    placement: () => shown?.placement ?? COVER,
    place: (placement) => {
      if (!shown) return;
      shown.placement = placement;
      render();
      const { photo } = shown;
      clearTimeout(saving);
      saving = setTimeout(() => keep({ photo, placement }), SAVE_DELAY);
    },
    photoSize: () => shown?.size ?? { width: 1, height: 1 },
    replace: () => picker.click(),
    remove: () => void use(null),
  });

  pill.addEventListener("click", () => {
    if (shown) arranger.open();
    else picker.click();
  });

  picker.addEventListener("change", () => {
    const file = firstImage(picker.files ?? []);
    picker.value = "";
    if (file) void use(file);
  });

  // The hint shows while files are dragged over the page. Entering and
  // leaving each element under the pointer fire in pairs, so a count of
  // them says when the drag has left the page.
  let over = 0;
  const filesIn = (e: DragEvent): boolean => carriesFiles([...(e.dataTransfer?.types ?? [])]);
  doc.addEventListener("dragenter", (e) => {
    if (!filesIn(e)) return;
    over += 1;
    hint.hidden = false;
  });
  doc.addEventListener("dragleave", (e) => {
    if (!filesIn(e)) return;
    over = Math.max(0, over - 1);
    hint.hidden = over === 0;
  });
  // A file dropped anywhere on the page is taken here, so the browser never
  // leaves the lesson to open it.
  doc.addEventListener("dragover", (e) => {
    if (!filesIn(e)) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
  });
  doc.addEventListener("drop", (e) => {
    if (!filesIn(e)) return;
    e.preventDefault();
    over = 0;
    hint.hidden = true;
    const file = firstImage(e.dataTransfer?.files ?? []);
    if (file) void use(file);
  });

  // A pasted image is a photo too, unless it is pasted into a text field.
  doc.addEventListener("paste", (e) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.("input, textarea, [contenteditable]")) return;
    const file = firstImage(e.clipboardData?.files ?? []);
    if (!file) return;
    e.preventDefault();
    void use(file);
  });

  view.addEventListener("resize", render);

  render();
  void store.load().then((saved) => {
    // A photo chosen while the remembered one loaded wins.
    if (saved && asked === 0) void show(saved);
  });
}
