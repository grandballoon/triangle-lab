// Loads the images lessons draw with `g.sprite` (draw.ts). Each URL is
// fetched once, the first time a lesson asks for it, and stays cached for the
// life of the page; until it has decoded, `get` returns null and the sprite is
// simply not drawn that frame.

import type { Picture, Pictures } from "./draw.ts";

export class SpriteCache implements Pictures {
  private readonly images = new Map<string, HTMLImageElement>();

  get(src: string): Picture | null {
    let img = this.images.get(src);
    if (!img) {
      img = new Image();
      img.decoding = "async";
      img.addEventListener("error", () => console.warn(`Sprite failed to load: ${src}`), { once: true });
      img.src = src;
      this.images.set(src, img);
    }
    if (!img.complete || img.naturalWidth === 0) return null;
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  }
}
