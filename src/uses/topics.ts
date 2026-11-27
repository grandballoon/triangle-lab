// The topics a lesson's uses are tagged with, and the pure functions that
// gather the uses of every lesson into lists by topic: for a lesson's Uses
// tab (lab/steps.ts), and for the gallery of their pictures (uses.html,
// src/uses/page.ts).
//
// A use names its topics in its own `tags` (lab/scene.ts `Use`), beside its
// text in the lesson that teaches it, so the copy editor still finds it there
// and a lesson's uses never drift from a separate list. A topic is one field
// of work or life the use comes from. A use may sit in several: a rafter cut
// with a framing square is carpentry, building, and a trick of the trade.
//
// To add a topic, add it to TOPICS; its place there is its place in every
// list. Ids are written into lessons, so renaming one means renaming its tags.

/** Every topic, in the order lists show them. */
export const TOPICS = [
  {
    id: "music",
    label: "Music and sound",
    blurb: "The mathematics of vibrating strings, pitch, rhythm and tuning.",
  },
  {
    id: "carpentry",
    label: "Carpentry",
    blurb: "Woodwork and framing, from squaring a deck to mitring a frame.",
  },
  {
    id: "electrical",
    label: "Electrical work",
    blurb: "Wiring, bending conduit and alternating current.",
  },
  {
    id: "plumbing",
    label: "Plumbing",
    blurb: "Pipe runs, offsets, falls and what a pipe holds.",
  },
  {
    id: "fiber-arts",
    label: "Fibre arts",
    blurb: "Sewing, quilting, knitting, crochet and weaving.",
  },
  {
    id: "gardening",
    label: "Gardening",
    blurb: "Laying out beds, spacing plants, watering lawns and mixing soil.",
  },
  {
    id: "nature",
    label: "The natural world",
    blurb: "How animals and plants use geometry, and the designs people borrow from them.",
  },
  {
    id: "game-design",
    label: "Game design and graphics",
    blurb: "Moving, turning and drawing things on a screen.",
  },
  {
    id: "astronomy",
    label: "Astronomy and space",
    blurb: "Measuring the Earth, the Moon, the Sun and the stars from the ground.",
  },
  {
    id: "trade-tricks",
    label: "Tricks of the trade",
    blurb: "Rules of thumb people learn on the job, and the mathematics that makes them work.",
  },
  {
    id: "building",
    label: "Building and architecture",
    blurb: "Roofs, ramps, arches, bridges, tiles and concrete.",
  },
  {
    id: "machines",
    label: "Engineering and machines",
    blurb: "Gears, belts, bolts, nuts, jacks and metalwork.",
  },
  {
    id: "computing",
    label: "Computing and data",
    blurb: "Networks, phones, drawing software and the pictures on a page.",
  },
  {
    id: "navigation",
    label: "Maps, surveying and navigation",
    blurb: "Fixing a position, measuring land, and finding a way.",
  },
  {
    id: "light",
    label: "Light, cameras and screens",
    blurb: "Mirrors, lenses, projectors and the shapes of screens.",
  },
  {
    id: "art",
    label: "Art, drawing and paper",
    blurb: "Compass constructions, folding, colour and drawing by hand.",
  },
  {
    id: "health",
    label: "Health and the body",
    blurb: "How the body moves, and making places anyone can use.",
  },
  {
    id: "sport",
    label: "Sport and play",
    blurb: "Pitches, tracks, throws, dice and puzzles.",
  },
  {
    id: "travel",
    label: "Travel and vehicles",
    blurb: "Roads, speeds, journeys and the vehicles that make them.",
  },
  {
    id: "home",
    label: "Home and kitchen",
    blurb: "Cooking, sharing, decorating and fitting things in.",
  },
  {
    id: "money",
    label: "Money and everyday sums",
    blurb: "Prices, plans, receipts and interest.",
  },
] as const satisfies readonly TopicInfo[];

export interface TopicInfo {
  /** The id a use's `tags` name it by: lower-case words joined by hyphens. */
  id: string;
  /** Its name, as lists head it. */
  label: string;
  /** One line under the name, saying what the topic covers. */
  blurb: string;
}

export type Topic = (typeof TOPICS)[number]["id"];

const ORDER = new Map<string, number>(TOPICS.map((t, i) => [t.id, i]));

/** The topic named `id`, or undefined for an id that names none. */
export function topicOf(id: string): TopicInfo | undefined {
  const at = ORDER.get(id);
  return at === undefined ? undefined : TOPICS[at];
}

/** Whether `id` names a topic. */
export const isTopic = (id: string): id is Topic => ORDER.has(id);

/** `tags` in the order of TOPICS, each once. */
export function sortTags(tags: readonly Topic[]): Topic[] {
  return [...new Set(tags)].sort((a, b) => ORDER.get(a)! - ORDER.get(b)!);
}

/** What is wrong with a use's tags, for the lesson tests: none, an unknown id, or one twice. */
export function tagFaults(tags: readonly string[] | undefined): string[] {
  if (!tags || tags.length === 0) return ["it has no tags"];
  const faults = tags.filter((t) => !isTopic(t)).map((t) => `"${t}" is not a topic (uses/topics.ts)`);
  if (new Set(tags).size !== tags.length) faults.push("it names a topic twice");
  return faults;
}

/** A use, with where it is taught: the lesson's slug and name, and its chapter. */
export interface Placed<U extends { tags: readonly Topic[] }> {
  slug: string;
  lesson: string;
  chapter: string;
  use: U;
}

/** One topic's uses, in reading order. */
export interface TopicGroup<U extends { tags: readonly Topic[] }> {
  topic: TopicInfo & { id: Topic };
  uses: Placed<U>[];
}

/**
 * The uses in `placed`, grouped by topic in the order of TOPICS, each group
 * in the order given (the reading order, as the caller lists them). A use
 * with several tags is in each of their groups; a topic with no uses is left
 * out. `only`, when given, keeps just the uses `only` accepts, as with a
 * picture.
 */
export function byTopic<U extends { tags: readonly Topic[] }>(
  placed: readonly Placed<U>[],
  only: (use: U) => boolean = () => true,
): TopicGroup<U>[] {
  return TOPICS.map((topic) => ({
    topic,
    uses: placed.filter((p) => only(p.use) && p.use.tags.includes(topic.id)),
  })).filter((g) => g.uses.length > 0);
}

/**
 * The topics to show, from the `topic` named in a page's address: that one
 * topic's group when it names one with uses, and otherwise every group.
 */
export function pickGroups<U extends { tags: readonly Topic[] }>(
  groups: readonly TopicGroup<U>[],
  topic: string | null,
): TopicGroup<U>[] {
  const one = groups.filter((g) => g.topic.id === topic);
  return one.length > 0 ? one : [...groups];
}

/**
 * The picture `delta` steps on from `at` in a sequence of `count`, wrapping
 * round at either end, so the gallery's viewer can walk a topic forever.
 */
export function stepIn(at: number, count: number, delta: number): number {
  if (count <= 0) return 0;
  return (((at + delta) % count) + count) % count;
}

/**
 * Every use of every lesson in `chapters`, in reading order, with where it
 * is taught; `usesOf` gives a lesson's uses, or nothing for one it has not
 * got (a lab lesson that failed to load, say).
 */
export function placeAll<U extends { tags: readonly Topic[] }>(
  chapters: readonly { title: string; lessons: readonly { slug: string; name: string }[] }[],
  usesOf: (slug: string) => readonly U[] | undefined,
): Placed<U>[] {
  return chapters.flatMap((chapter) =>
    chapter.lessons.flatMap((lesson) =>
      (usesOf(lesson.slug) ?? []).map((use) => ({ slug: lesson.slug, lesson: lesson.name, chapter: chapter.title, use })),
    ),
  );
}
