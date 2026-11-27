import { describe, expect, it } from "vitest";
import { TOPICS, byTopic, isTopic, pickGroups, placeAll, sortTags, stepIn, tagFaults, topicOf, type Topic } from "./topics.ts";

const use = (title: string, tags: Topic[], image = true) => ({ title, tags, image: image ? "pic" : undefined });

describe("TOPICS", () => {
  it("names each topic once, by a hyphenated lower-case id, with a label and a line on what it covers", () => {
    const ids = TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TOPICS) {
      expect(t.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(t.label.trim()).not.toBe("");
      expect(t.blurb).toMatch(/\.$/);
    }
  });

  it("looks a topic up by its id", () => {
    expect(topicOf("music")?.label).toBe("Music and sound");
    expect(topicOf("cooking")).toBeUndefined();
    expect(isTopic("astronomy")).toBe(true);
    expect(isTopic("Astronomy")).toBe(false);
  });
});

describe("sortTags", () => {
  it("puts tags in the order of TOPICS, each once", () => {
    expect(sortTags(["home", "music", "carpentry", "music"])).toEqual(["music", "carpentry", "home"]);
  });
});

describe("tagFaults", () => {
  it("takes one or more known topics", () => {
    expect(tagFaults(["carpentry"])).toEqual([]);
    expect(tagFaults(["carpentry", "trade-tricks", "building"])).toEqual([]);
  });

  it("asks for a tag, refuses an unknown one, and a topic named twice", () => {
    expect(tagFaults(undefined)).toEqual(["it has no tags"]);
    expect(tagFaults([])).toEqual(["it has no tags"]);
    expect(tagFaults(["woodwork", "music", "music"])).toEqual(['"woodwork" is not a topic (uses/topics.ts)', "it names a topic twice"]);
  });
});

describe("placeAll", () => {
  it("lists every lesson's uses in reading order, with the lesson and chapter they are taught in", () => {
    const chapters = [
      { title: "Circles", lessons: [{ slug: "circle-pi", name: "Circumference" }, { slug: "missing", name: "Gone" }] },
      { title: "Angles", lessons: [{ slug: "angles", name: "Angles" }] },
    ];
    const uses: Record<string, ReturnType<typeof use>[]> = {
      "circle-pi": [use("A drum", ["music"]), use("A cake", ["home"])],
      angles: [use("A ramp", ["building"])],
    };
    expect(placeAll(chapters, (slug) => uses[slug]).map((p) => [p.chapter, p.lesson, p.slug, p.use.title])).toEqual([
      ["Circles", "Circumference", "circle-pi", "A drum"],
      ["Circles", "Circumference", "circle-pi", "A cake"],
      ["Angles", "Angles", "angles", "A ramp"],
    ]);
  });
});

describe("byTopic", () => {
  const placed = [
    { slug: "a", lesson: "A", chapter: "C", use: use("Frets", ["music", "fiber-arts"]) },
    { slug: "b", lesson: "B", chapter: "C", use: use("Rafters", ["carpentry", "trade-tricks"]) },
    { slug: "c", lesson: "C", chapter: "C", use: use("Bunting", ["fiber-arts"], false) },
  ];

  it("groups uses in the order of TOPICS, a use with several tags in each, leaving out empty topics", () => {
    expect(byTopic(placed).map((g) => [g.topic.id, g.uses.map((p) => p.use.title)])).toEqual([
      ["music", ["Frets"]],
      ["carpentry", ["Rafters"]],
      ["fiber-arts", ["Frets", "Bunting"]],
      ["trade-tricks", ["Rafters"]],
    ]);
  });

  it("keeps only the uses asked for, as those with a picture", () => {
    expect(byTopic(placed, (u) => u.image !== undefined).find((g) => g.topic.id === "fiber-arts")!.uses.map((p) => p.use.title)).toEqual(["Frets"]);
  });

  it("shows one topic the address names, or every topic when it names none with uses", () => {
    const groups = byTopic(placed);
    expect(pickGroups(groups, "carpentry").map((g) => g.topic.id)).toEqual(["carpentry"]);
    expect(pickGroups(groups, null)).toHaveLength(4);
    expect(pickGroups(groups, "astronomy")).toHaveLength(4);
    expect(pickGroups(groups, "nonsense")).toHaveLength(4);
  });
});

describe("stepIn", () => {
  it("steps through a sequence, wrapping round at either end", () => {
    expect(stepIn(0, 5, 1)).toBe(1);
    expect(stepIn(4, 5, 1)).toBe(0);
    expect(stepIn(0, 5, -1)).toBe(4);
    expect(stepIn(2, 5, -7)).toBe(0);
    expect(stepIn(0, 0, 1)).toBe(0);
  });
});
