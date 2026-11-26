// What makes a recommended image sound: the picture a lesson gives one of its
// uses (UseImage, lab/scene.ts), and each file kept in this folder for one.
// Pure: values in, the faults found out, so the tests can hold every lesson
// and every file to them by plain equality (lab/lessons.test.ts,
// pages.test.ts, images.test.ts).

import type { UseImage } from "../lab/scene.ts";

/** The kinds of file a recommended image may be, by extension. */
export const IMAGE_TYPES = ["jpg", "jpeg", "png", "webp", "avif", "svg"] as const;

/**
 * Largest a file may be. The pictures sit in a column a few hundred pixels
 * wide, so about 1200 pixels across is plenty, and that fits in this as a
 * JPEG or WebP; anything bigger only slows the page and grows the repository.
 */
export const MAX_IMAGE_BYTES = 400 * 1024;

/** What is wrong with a use's image, if anything. */
export function imageFaults(image: UseImage): string[] {
  const faults: string[] = [];
  if (image.src.trim() === "") faults.push("it has no src");
  if (image.caption.trim() === "") faults.push("it has no caption");
  if (image.caption.includes("$")) faults.push("its caption is plain text, without LaTeX");
  if (image.alt !== undefined && image.alt.trim() === "") faults.push("its alt is empty; leave it out instead");
  return faults;
}

/** What is wrong with a file kept in this folder as a recommended image, if anything. */
export function fileFaults(name: string, bytes: number): string[] {
  const faults: string[] = [];
  const extension = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1) : "";
  if (!(IMAGE_TYPES as readonly string[]).includes(extension)) {
    faults.push(`${name} is not one of ${IMAGE_TYPES.join(", ")} (lower-case extension)`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z]+$/.test(name)) faults.push(`${name} is not named in lower-case words joined by hyphens`);
  if (bytes > MAX_IMAGE_BYTES) {
    faults.push(`${name} is ${Math.round(bytes / 1024)} KB, over ${MAX_IMAGE_BYTES / 1024} KB: resize it to about 1200 pixels across`);
  }
  return faults;
}
