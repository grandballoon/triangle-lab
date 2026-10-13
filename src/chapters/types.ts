// The shape of a lesson's entry in the reading order (src/lessons.ts).

export interface Lesson {
  /** Unique id. A standalone lesson's page is `<slug>.html`; a lab lesson's
   *  module is `src/lab/lessons/<slug>.ts`. */
  slug: string;
  /** Section and position within it, e.g. "Trigonometry · Two". */
  part: string;
  name: string;
  /** One line on the menu card — what the reader does with their hands. */
  desc: string;
  accent: string;
  /** Inner markup of a `0 0 32 32` SVG. Strokes and fills use currentColor so
   *  the accent is set once, by whoever renders the icon. */
  icon: string;
  /** True for lessons hosted by the lab page (lab.html) rather than a page of
   *  their own. */
  lab?: boolean;
}

export interface Chapter {
  title: string;
  /** One line under the chapter heading on the menu. */
  blurb: string;
  lessons: Lesson[];
}
