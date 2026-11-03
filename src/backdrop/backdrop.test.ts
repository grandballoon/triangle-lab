// @vitest-environment jsdom
//
// The photo backdrop against a DOM stand-in: a dropped, pasted or picked
// photo shows over the camera and is remembered; the pill then arranges it,
// and dragging, the size buttons and the keys move it where it is drawn and
// kept, without reaching the lesson underneath.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COVER } from "./core.ts";
import { mountBackdrop, type PhotoStore } from "./index.ts";
import { readSaved, type Saved } from "./store.ts";

let saved: Saved | null;
let undecodable: Set<string>;

/** A store holding `saved`, as IndexedDB would between pages. */
const store: PhotoStore = {
  load: async () => saved,
  save: async (next) => void (saved = next),
};

beforeEach(() => {
  saved = null;
  undecodable = new Set();
  let n = 0;
  const blobs = new Map<string, Blob>();
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: (blob: Blob) => {
      const url = `blob:photo-${++n}`;
      blobs.set(url, blob);
      return url;
    },
    revokeObjectURL: (url: string) => void blobs.delete(url),
  });
  // jsdom neither decodes images nor knows their size: every photo here is
  // 1000 × 500, and a blob whose type is listed fails to decode.
  HTMLImageElement.prototype.decode = function (this: HTMLImageElement) {
    const blob = blobs.get(this.src);
    return blob && !undecodable.has(blob.type) ? Promise.resolve() : Promise.reject(new Error("decode"));
  };
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", { get: () => 1000, configurable: true });
  Object.defineProperty(HTMLImageElement.prototype, "naturalHeight", { get: () => 500, configurable: true });
  // A window of another shape, which the photo covers by its height.
  vi.stubGlobal("innerWidth", 1200);
  vi.stubGlobal("innerHeight", 800);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const settle = () => new Promise((r) => setTimeout(r, 0));

async function mount() {
  document.body.innerHTML = `<video id="cam"></video><div id="veil"></div><header id="topbar"><div id="heading"></div></header>`;
  mountBackdrop(document.getElementById("topbar")!, document.getElementById("cam") as HTMLVideoElement, store);
  await settle();
  const frame = document.getElementById("photo")!;
  const button = (name: string) => document.querySelector<HTMLButtonElement>(`#photo-bar button[aria-label^="${name}"]`)!;
  return {
    frame,
    image: frame.querySelector("img")!,
    pill: document.querySelector<HTMLButtonElement>(".nav-photo")!,
    picker: document.querySelector<HTMLInputElement>('input[type="file"]')!,
    hint: document.getElementById("photo-drop")!,
    layer: document.getElementById("photo-arrange")!,
    bar: document.getElementById("photo-bar")!,
    size: document.querySelector(".photo-size")!,
    button,
  };
}

function drag(type: string, files: File[]): Event {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(e, "dataTransfer", { value: { types: ["Files"], files, dropEffect: "none" } });
  document.body.dispatchEvent(e);
  return e;
}

function pointer(target: EventTarget, type: string, x: number, y: number, id = 1): void {
  const e = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
  Object.defineProperty(e, "pointerId", { value: id });
  target.dispatchEvent(e);
}

const jpeg = () => new File(["x"], "room.jpg", { type: "image/jpeg" });

const boxOf = (image: HTMLImageElement) => ({
  left: image.style.left,
  top: image.style.top,
  width: image.style.width,
  height: image.style.height,
});

/** A page showing a dropped photo. */
async function withPhoto() {
  const page = await mount();
  drag("drop", [jpeg()]);
  await settle();
  return page;
}

describe("showing a photo", () => {
  it("lays the photo between the camera and the veil, hidden until there is one", async () => {
    const { frame, pill } = await mount();
    expect(frame.previousElementSibling?.id).toBe("cam");
    expect(frame.nextElementSibling?.id).toBe("veil");
    expect(frame.hidden).toBe(true);
    expect(pill.getAttribute("aria-pressed")).toBe("false");
    expect(pill.nextElementSibling?.id).toBe("heading");
  });

  it("shows a dropped photo covering the window, and remembers it", async () => {
    const { frame, image, pill, hint } = await mount();
    drag("dragenter", []);
    expect(hint.hidden).toBe(false);
    expect(drag("dragover", []).defaultPrevented).toBe(true);
    const file = jpeg();
    expect(drag("drop", [file]).defaultPrevented).toBe(true);
    await settle();
    expect(hint.hidden).toBe(true);
    expect(frame.hidden).toBe(false);
    expect(image.getAttribute("src")).toMatch(/^blob:/);
    expect(boxOf(image)).toEqual({ left: "-200px", top: "0px", width: "1600px", height: "800px" });
    expect(pill.getAttribute("aria-pressed")).toBe("true");
    expect(pill.title).toBe("Arrange the background photo");
    expect(saved).toEqual({ photo: file, placement: COVER });
  });

  it("hides the drop hint when the drag leaves the page", async () => {
    const { hint } = await mount();
    drag("dragenter", []);
    drag("dragenter", []);
    drag("dragleave", []);
    expect(hint.hidden).toBe(false);
    drag("dragleave", []);
    expect(hint.hidden).toBe(true);
  });

  it("opens the remembered photo on the next page, where it was placed", async () => {
    saved = { photo: jpeg(), placement: { x: 0.1, y: 0, scale: 0.5 } };
    const { frame, image } = await mount();
    await settle();
    expect(frame.hidden).toBe(false);
    expect(boxOf(image)).toEqual({ left: "360px", top: "200px", width: "800px", height: "400px" });
  });

  it("reads a bare photo kept before photos could be moved as covering the window", () => {
    const photo = jpeg();
    expect(readSaved(photo)).toEqual({ photo, placement: COVER });
    expect(readSaved(undefined)).toBeNull();
    expect(readSaved({ placement: COVER })).toBeNull();
  });

  it("keeps what it had when a photo will not decode", async () => {
    undecodable.add("image/heic");
    const { frame } = await mount();
    drag("drop", [new File(["x"], "a.heic", { type: "image/heic" })]);
    await settle();
    expect(frame.hidden).toBe(true);
    expect(saved).toBeNull();
  });

  it("takes a pasted image, but not one pasted into a text field", async () => {
    const { frame } = await mount();
    const paste = (target: EventTarget) => {
      const e = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(e, "clipboardData", { value: { files: [jpeg()] } });
      target.dispatchEvent(e);
    };
    const field = document.createElement("textarea");
    document.body.append(field);
    paste(field);
    await settle();
    expect(frame.hidden).toBe(true);
    paste(document.body);
    await settle();
    expect(frame.hidden).toBe(false);
  });

  it("opens the file picker from the pill while there is no photo, and shows the photo picked", async () => {
    const { frame, pill, picker, bar } = await mount();
    const open = vi.spyOn(picker, "click").mockImplementation(() => {});
    pill.click();
    expect(open).toHaveBeenCalled();
    expect(bar.hidden).toBe(true);
    Object.defineProperty(picker, "files", { value: [jpeg()], configurable: true });
    picker.dispatchEvent(new Event("change"));
    await settle();
    expect(frame.hidden).toBe(false);
  });
});

describe("arranging the photo", () => {
  it("opens from the pill once a photo shows, over the whole page", async () => {
    const { pill, layer, bar, size } = await withPhoto();
    pill.click();
    expect(layer.hidden).toBe(false);
    expect(bar.hidden).toBe(false);
    expect(size.textContent).toBe("100%");
  });

  it("moves the photo by a drag, and keeps where it was left once the drag settles", async () => {
    const { pill, layer, image } = await withPhoto();
    vi.useFakeTimers();
    pill.click();
    pointer(layer, "pointerdown", 600, 400);
    pointer(layer, "pointermove", 760, 320);
    pointer(layer, "pointerup", 760, 320);
    expect(boxOf(image)).toEqual({ left: "-40px", top: "-80px", width: "1600px", height: "800px" });
    expect(saved?.placement).toEqual(COVER);
    vi.advanceTimersByTime(300);
    expect(saved?.placement).toEqual({ x: 0.1, y: -0.1, scale: 1 });
  });

  it("resizes with the buttons and fits again", async () => {
    const { pill, image, size, button } = await withPhoto();
    pill.click();
    button("Larger").click();
    expect(size.textContent).toBe("125%");
    expect(image.style.width).toBe("2000px");
    button("Smaller").click();
    button("Smaller").click();
    expect(size.textContent).toBe("80%");
    button("Fit").click();
    expect(size.textContent).toBe("100%");
    expect(boxOf(image)).toEqual({ left: "-200px", top: "0px", width: "1600px", height: "800px" });
  });

  it("moves the photo with the arrows instead of stepping the lesson, and closes on Escape", async () => {
    const { pill, image, bar } = await withPhoto();
    const lesson = vi.fn();
    window.addEventListener("keydown", lesson);
    pill.click();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, cancelable: true }));
    expect(image.style.left).toBe("-150px");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
    expect(bar.hidden).toBe(true);
    expect(lesson).not.toHaveBeenCalled();
    // Closed, the arrows are the lesson's again.
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", cancelable: true }));
    expect(lesson).toHaveBeenCalledTimes(1);
    expect(image.style.left).toBe("-150px");
    window.removeEventListener("keydown", lesson);
  });

  it("removes the photo, back to the camera", async () => {
    const { pill, frame, bar, layer, button } = await withPhoto();
    pill.click();
    button("Remove").click();
    await settle();
    expect(bar.hidden).toBe(true);
    expect(layer.hidden).toBe(true);
    expect(frame.hidden).toBe(true);
    expect(saved).toBeNull();
    expect(pill.getAttribute("aria-pressed")).toBe("false");
  });

  it("replaces the photo with another, covering the window again", async () => {
    const { pill, picker, image, size, button } = await withPhoto();
    pill.click();
    button("Larger").click();
    const open = vi.spyOn(picker, "click").mockImplementation(() => {});
    button("Use another").click();
    expect(open).toHaveBeenCalled();
    const next = jpeg();
    Object.defineProperty(picker, "files", { value: [next], configurable: true });
    picker.dispatchEvent(new Event("change"));
    await settle();
    expect(image.style.width).toBe("1600px");
    expect(size.textContent).toBe("100%");
    expect(saved).toEqual({ photo: next, placement: COVER });
  });
});
