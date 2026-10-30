// A photo behind the figure, in place of the camera's picture: dropped onto
// the page, pasted, or picked with the pill in the top bar. Pressing the pill
// again takes the photo away, back to the camera.
//
// The photo lies over the camera's <video> and under the veil, and leaves the
// camera itself alone: hand tracking still reads it, and it is still turned
// on and off from the hands settings sheet. A photo is never mirrored.
//
// The photo is remembered, as the camera's choice is (webcam.ts), so the next
// lesson page opens over it too. It is kept in IndexedDB, since a photo is
// too big for localStorage.
//
// Both kinds of lesson page mount it: page.ts for a standalone lesson, the
// lab page's main.ts for a lab lesson.

import "./backdrop.css";

/** Where the photo is kept between pages. */
export interface PhotoStore {
  load(): Promise<Blob | null>;
  save(photo: Blob | null): Promise<void>;
}

/** The first image among these files, if there is one. */
export function firstImage<T extends { type: string }>(files: Iterable<T>): T | null {
  for (const file of files) if (file.type.startsWith("image/")) return file;
  return null;
}

/** Whether a drag carries files, rather than text or a link from the page. */
export function carriesFiles(types: readonly string[]): boolean {
  return types.includes("Files");
}

/** What the pill offers to do, given whether a photo is showing. */
export function pillLabel(showing: boolean): string {
  return showing ? "Back to the camera" : "Use a photo as the background";
}

// A framed landscape: a sun over two hills.
const ICON = `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
  <rect x="1.8" y="2.8" width="12.4" height="10.4" rx="1.6" />
  <circle cx="10.6" cy="6" r="1.2" />
  <path d="M1.8 11.4l3.6-3.8 3.4 3.4 1.8-1.8 3.6 3.4" />
</svg>`;

/**
 * Add the pill to the top bar, before the lesson's heading, and the photo
 * over `video`, and show the remembered photo, if any.
 */
export function mountBackdrop(topbar: HTMLElement, video: HTMLVideoElement, store: PhotoStore = idbStore()): void {
  const doc = topbar.ownerDocument;

  const photo = doc.createElement("img");
  photo.id = "photo";
  photo.alt = "";
  photo.hidden = true;
  video.after(photo);

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

  let url: string | null = null;
  // Each photo asked for takes a number, so one that decodes after a later
  // one was asked for is dropped rather than shown over it.
  let asked = 0;

  const render = (): void => {
    const showing = url !== null;
    photo.hidden = !showing;
    const label = pillLabel(showing);
    pill.title = label;
    pill.setAttribute("aria-label", label);
    pill.setAttribute("aria-pressed", String(showing));
  };

  /** Show this photo, or none. False when the photo would not decode. */
  const show = async (blob: Blob | null): Promise<boolean> => {
    const ticket = ++asked;
    const next = blob ? URL.createObjectURL(blob) : null;
    if (next) {
      const decoded = new Image();
      decoded.src = next;
      try {
        await decoded.decode();
      } catch {
        // Not an image this browser can draw (a HEIC photo, say).
        URL.revokeObjectURL(next);
        return false;
      }
    }
    if (ticket !== asked) {
      if (next) URL.revokeObjectURL(next);
      return false;
    }
    if (url) URL.revokeObjectURL(url);
    url = next;
    if (next) photo.src = next;
    else photo.removeAttribute("src");
    render();
    return true;
  };

  const use = async (blob: Blob | null): Promise<void> => {
    if (await show(blob)) await store.save(blob);
  };

  pill.addEventListener("click", () => {
    if (url) void use(null);
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

  render();
  void store.load().then((blob) => {
    // A photo chosen while the remembered one loaded wins.
    if (blob && asked === 0) void show(blob);
  });
}

const DB = "triangle-lab-backdrop";
const STORE = "photo";
const KEY = "photo";

/** The photo kept in IndexedDB. Without it, the photo lasts for this page only. */
function idbStore(): PhotoStore {
  const open = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const request = indexedDB.open(DB, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  const run = async <T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const request = act(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  };
  return {
    async load() {
      try {
        const value: unknown = await run("readonly", (s) => s.get(KEY));
        return value instanceof Blob ? value : null;
      } catch {
        return null;
      }
    },
    async save(photo) {
      try {
        if (photo) await run("readwrite", (s) => s.put(photo, KEY));
        else await run("readwrite", (s) => s.delete(KEY));
      } catch {
        // Blocked or full: the photo lasts for this page only.
      }
    },
  };
}
