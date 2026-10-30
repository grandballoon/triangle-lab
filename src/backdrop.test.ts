// @vitest-environment jsdom
//
// The photo backdrop: which file of a drop or paste is taken, and, against a
// DOM stand-in, that a dropped, pasted or picked photo shows over the camera
// and is remembered, and that the pill takes it away again.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { carriesFiles, firstImage, mountBackdrop, pillLabel, type PhotoStore } from "./backdrop.ts";

describe("firstImage", () => {
  it("takes the first image and passes over other files", () => {
    const files = [{ type: "text/plain" }, { type: "image/png" }, { type: "image/jpeg" }];
    expect(firstImage(files)).toBe(files[1]);
  });

  it("finds nothing among no images", () => {
    expect(firstImage([{ type: "application/pdf" }, { type: "" }])).toBeNull();
    expect(firstImage([])).toBeNull();
  });
});

describe("carriesFiles", () => {
  it("tells a drag of files from one of text or a link", () => {
    expect(carriesFiles(["Files"])).toBe(true);
    expect(carriesFiles(["text/plain", "text/uri-list"])).toBe(false);
  });
});

describe("pillLabel", () => {
  it("offers a photo over the camera, and the camera over a photo", () => {
    expect(pillLabel(false)).toBe("Use a photo as the background");
    expect(pillLabel(true)).toBe("Back to the camera");
  });
});

describe("mountBackdrop", () => {
  let saved: Blob | null;
  let undecodable: Set<string>;

  /** A store holding `saved`, as IndexedDB would between pages. */
  const store: PhotoStore = {
    load: async () => saved,
    save: async (photo) => void (saved = photo),
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
    // jsdom does not decode images; a blob whose type is listed fails to.
    HTMLImageElement.prototype.decode = function (this: HTMLImageElement) {
      const blob = blobs.get(this.src);
      return blob && !undecodable.has(blob.type) ? Promise.resolve() : Promise.reject(new Error("decode"));
    };
  });

  afterEach(() => vi.unstubAllGlobals());

  const settle = () => new Promise((r) => setTimeout(r, 0));

  async function mount() {
    document.body.innerHTML = `<video id="cam"></video><div id="veil"></div><header id="topbar"><div id="heading"></div></header>`;
    const video = document.getElementById("cam") as HTMLVideoElement;
    mountBackdrop(document.getElementById("topbar")!, video, store);
    await settle();
    return {
      photo: document.getElementById("photo") as HTMLImageElement,
      pill: document.querySelector<HTMLButtonElement>(".nav-photo")!,
      picker: document.querySelector<HTMLInputElement>('input[type="file"]')!,
      hint: document.getElementById("photo-drop")!,
    };
  }

  function drag(type: string, files: File[]): Event {
    const e = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(e, "dataTransfer", { value: { types: ["Files"], files, dropEffect: "none" } });
    document.body.dispatchEvent(e);
    return e;
  }

  const jpeg = () => new File(["x"], "room.jpg", { type: "image/jpeg" });

  it("lays the photo between the camera and the veil, hidden until there is one", async () => {
    const { photo, pill } = await mount();
    expect(photo.previousElementSibling?.id).toBe("cam");
    expect(photo.nextElementSibling?.id).toBe("veil");
    expect(photo.hidden).toBe(true);
    expect(pill.getAttribute("aria-pressed")).toBe("false");
    expect(pill.nextElementSibling?.id).toBe("heading");
  });

  it("shows a dropped photo and remembers it, and the pill goes back to the camera", async () => {
    const { photo, pill, hint } = await mount();
    drag("dragenter", []);
    expect(hint.hidden).toBe(false);
    expect(drag("dragover", []).defaultPrevented).toBe(true);
    const file = jpeg();
    expect(drag("drop", [file]).defaultPrevented).toBe(true);
    await settle();
    expect(hint.hidden).toBe(true);
    expect(photo.hidden).toBe(false);
    expect(photo.getAttribute("src")).toMatch(/^blob:/);
    expect(pill.getAttribute("aria-pressed")).toBe("true");
    expect(pill.title).toBe("Back to the camera");
    expect(saved).toBe(file);

    pill.click();
    await settle();
    expect(photo.hidden).toBe(true);
    expect(photo.hasAttribute("src")).toBe(false);
    expect(saved).toBeNull();
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

  it("opens the remembered photo on the next page", async () => {
    saved = jpeg();
    const { photo, pill } = await mount();
    await settle();
    expect(photo.hidden).toBe(false);
    expect(pill.getAttribute("aria-pressed")).toBe("true");
  });

  it("keeps what it had when a photo will not decode", async () => {
    undecodable.add("image/heic");
    const { photo } = await mount();
    drag("drop", [new File(["x"], "a.heic", { type: "image/heic" })]);
    await settle();
    expect(photo.hidden).toBe(true);
    expect(saved).toBeNull();
  });

  it("takes a pasted image, but not one pasted into a text field", async () => {
    const { photo } = await mount();
    const paste = (target: EventTarget) => {
      const e = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(e, "clipboardData", { value: { files: [jpeg()] } });
      target.dispatchEvent(e);
    };
    const field = document.createElement("textarea");
    document.body.append(field);
    paste(field);
    await settle();
    expect(photo.hidden).toBe(true);
    paste(document.body);
    await settle();
    expect(photo.hidden).toBe(false);
  });

  it("opens the file picker from the pill, and shows the photo picked", async () => {
    const { photo, pill, picker } = await mount();
    const open = vi.spyOn(picker, "click").mockImplementation(() => {});
    pill.click();
    expect(open).toHaveBeenCalled();
    Object.defineProperty(picker, "files", { value: [jpeg()], configurable: true });
    picker.dispatchEvent(new Event("change"));
    await settle();
    expect(photo.hidden).toBe(false);
  });
});
