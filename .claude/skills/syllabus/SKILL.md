---
name: syllabus
description: Write src/recall/syllabus.json, what each Triangle Lab lesson teaches and which lessons it builds on, from the lessons' own source, for every lesson not yet described or whose teaching text has changed since. Claude reads it when picking the shortest next steps from a free association on the recall page. Use when the user runs /syllabus, asks to refresh or fill in the syllabus, when the test "describes every lesson as its teaching text now stands" fails, and after adding a lesson or changing what one says.
---

# Writing the syllabus

`src/recall/syllabus.json` says, for each lesson, what it teaches and which lessons it builds on.
The Worker gives it to Claude when reading a free association (`worker/associate.ts`), so Claude picks next steps from what the lessons actually establish, and from their real prerequisites.
Writing it here, in Claude Code, costs no Claude API tokens; `npm run deploy` describes through the API only what is still stale when it runs.

Each entry is stamped with a hash of its lesson's teaching text: its name, place and description, and the titles and texts of its steps and uses.
A test fails while any lesson is undescribed or its teaching text has changed since; this skill is how to fix it.
Never write or change a `source` hash yourself, and never edit the file's other parts by hand: `tools/syllabus.ts` does the bookkeeping.

## Steps

Run every command from the project root with Node 22 or later on the PATH (the shell's default Node may be 18):

```bash
export PATH=$HOME/.nvm/versions/node/v22.22.3/bin:$PATH
```

1. See what needs writing:

   ```bash
   node tools/syllabus.ts status
   ```

   It lists the lessons not yet described and those whose teaching text has changed since, each with the files it is taught from.
   If the user named lessons or a chapter, do only those.
   If nothing is listed, say so and stop.

2. Read `tools/syllabus-guide.md`: it says how to write an entry, and the API refresh follows the same guide, so entries read alike whichever wrote them.
   Read `src/lessons.ts` once for the reading order, the chapters, and the results each chapter lists as its axioms.

3. For each lesson listed, read its source files: the steps and uses of a lab lesson, or the page module and its entry in `src/directions.ts` for a standalone page.
   With many lessons, work a chapter at a time; chapters can be read in parallel by subagents, each given the guide and returning entries for you to write.

4. Write each lesson's entry under `lessons` in `src/recall/syllabus.json`, keyed by its slug, with `source` set to `""`, `teaches` and `builds_on` as the guide says.

5. Stamp the entries you wrote, which also puts the file in reading order and checks it:

   ```bash
   node tools/syllabus.ts stamp <slug> <slug> ...
   ```

   Fix anything it reports and stamp again.

6. Run the tests that guard the file:

   ```bash
   npx vitest run src/recall/syllabus.test.ts tools/syllabus.test.ts
   ```

7. Tell the user how many lessons were written or rewritten, and what `node tools/syllabus.ts status` now says.
   The Worker reads the syllabus when it is built, so the change reaches Claude's readings with the next `npm run deploy` (or `npm run preview` locally).
