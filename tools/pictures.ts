// Lets a tool run by plain Node import the site's modules that import
// pictures, as src/asides.ts and the lab lessons do: each picture imports as
// its file URL, much as Vite gives it a URL. Import this before any such
// module, through a dynamic import, since static imports are all loaded
// before any code runs:
//
//   import "./pictures.ts";
//   const { asides } = await import("../src/asides.ts");

import { register } from "node:module";

register("./pictures-hook.ts", import.meta.url);
