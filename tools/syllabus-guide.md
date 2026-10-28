# How to describe a lesson for the syllabus

Each lesson's entry in `src/recall/syllabus.json` has two parts, written from the lesson's own source.
This guide is shared: the `/syllabus` skill in Claude Code follows it, and `node tools/syllabus.ts refresh` gives it to the Claude API, so both write entries the same way.

## `teaches`

Two to six short statements of what the lesson establishes, as the learner should be able to state them from memory.

- State the mathematics itself: definitions, theorems, formulas, methods, and when they apply.
- Do not describe what the learner does with their hands, the figure, or the lesson's real-world examples.
- Take the facts from the lesson's steps (their `title` and `text`) and its uses; do not add results the lesson does not teach.
- Use the lesson's own notation, with `$…$` LaTeX for mathematics and no other dollar signs.

## `builds_on`

The slugs of the lessons whose content this one directly needs: the fewest that cover it, not everything earlier in the course.

- A lesson that needs nothing from another lesson builds on nothing (`[]`).
- Prerequisites may come from any chapter, but a lesson never builds on itself, and no lessons may build on each other in a circle.
- Prefer a lesson that comes before this one in the reading order; name a later one only when this lesson truly needs it.

## Example

```json
"medians": {
  "teaches": [
    "A median joins a vertex to the midpoint of the opposite side.",
    "The three medians meet at one point, the centroid $G$.",
    "$G$ lies two thirds of the way along each median from its vertex."
  ],
  "builds_on": ["perimeter"]
}
```
