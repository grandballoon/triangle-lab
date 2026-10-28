// The syllabus's bookkeeping (src/recall/syllabus.json): which lessons it
// does not yet describe, or describes from teaching text that has changed
// since, stamping entries with the hash of the text they were written from,
// and describing stale lessons through the Claude API. Claude Code's
// /syllabus skill (.claude/skills/syllabus/SKILL.md) writes entries itself
// and uses this to stamp them; `npm run deploy` refreshes through the API
// whatever is still stale, so nothing stale is ever deployed.
//
//   node tools/syllabus.ts status            what is missing or stale, with each lesson's source files
//   node tools/syllabus.ts stamp <slug>...   stamp those entries with their lesson's hash, and tidy the file
//   node tools/syllabus.ts check             what is wrong with the file, if anything
//   node tools/syllabus.ts refresh           describe every stale lesson through the Claude API
//
// A lesson's hash is of its teaching text only: its name, place and
// description, and the title and text of its steps and uses. A change to
// how it draws or moves leaves its entry as it was.
//
// Runs on Node 22 or later, which runs TypeScript as it is.

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { directions } from "../src/directions.ts";
import { lessons } from "../src/lessons.ts";
import { course, problems, readSyllabus, saveSyllabus, stale, type Syllabus } from "../src/recall/syllabus.ts";
import { entryParams, writtenOf, type LessonFile } from "./syllabus-claude.ts";
import { devVar } from "./dev-vars.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Where the syllabus is kept. */
export const SYLLABUS_PATH = join(ROOT, "src/recall/syllabus.json");

/** How entries are written, for Claude Code and the API alike. */
export const GUIDE_PATH = join(ROOT, "tools/syllabus-guide.md");

/** Lessons described at once through the API. */
const AT_ONCE = 4;

/**
 * The files a lesson is taught from, relative to the project: a lab lesson's
 * module, or the module a standalone page loads (named in <slug>.html) and
 * its directions (src/directions.ts, of which only its own steps count).
 */
export function sourcesOf(slug: string): string[] {
  const lesson = lessons.find((l) => l.slug === slug);
  if (!lesson) throw new Error(`${slug} is not a lesson in the course.`);
  if (lesson.lab) return [`src/lab/lessons/${slug}.ts`];
  const page = readFileSync(join(ROOT, `${slug}.html`), "utf8");
  const modules = [...page.matchAll(/<script[^>]*src="\/(src\/[^"]+\.ts)"/g)].map((m) => m[1]).filter((m) => m !== "src/page.ts");
  return [...modules, "src/directions.ts"];
}

/** The lesson's files as sent to Claude: a standalone page's directions as its own steps alone. */
function filesOf(slug: string): LessonFile[] {
  return sourcesOf(slug).map((path) => ({
    path,
    text: path === "src/directions.ts" ? JSON.stringify(directions[slug] ?? [], null, 2) : readFileSync(join(ROOT, path), "utf8"),
  }));
}

/** Every `title` and `text` a module gives as a string, in order: its steps' and uses' words. */
export function teachingText(source: string): string[] {
  return [...source.matchAll(/\b(?:title|text)\s*:\s*("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g)].map((m) => m[1]);
}

/** A short hash of what a lesson teaches, as its source now stands. */
export function hashOf(slug: string): string {
  const lesson = lessons.find((l) => l.slug === slug)!;
  const hash = createHash("sha256");
  hash.update(JSON.stringify([lesson.name, lesson.part, lesson.desc]));
  for (const { text } of filesOf(slug)) hash.update(JSON.stringify(teachingText(text)));
  return hash.digest("hex").slice(0, 12);
}

/** Every lesson's hash, in reading order. */
export function hashes(): Map<string, string> {
  return new Map(lessons.map((l) => [l.slug, hashOf(l.slug)]));
}

export function load(): Syllabus {
  return existsSync(SYLLABUS_PATH) ? readSyllabus(JSON.parse(readFileSync(SYLLABUS_PATH, "utf8"))) : {};
}

function save(syllabus: Syllabus): void {
  writeFileSync(SYLLABUS_PATH, `${JSON.stringify(saveSyllabus(syllabus), null, 2)}\n`);
}

/** The Claude API key: from the environment, or the project's .dev.vars, as `npm run preview` has it. */
function apiKey(): string | null {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const vars = join(ROOT, ".dev.vars");
  return existsSync(vars) ? devVar(readFileSync(vars, "utf8"), "ANTHROPIC_API_KEY") : null;
}

/** Describe every stale lesson through the Claude API, saving each entry as it comes. */
async function refresh(): Promise<number> {
  const syllabus = load();
  const { missing, changed } = stale(syllabus, hashes());
  const todo = [...missing, ...changed];
  if (todo.length === 0) {
    console.log("The syllabus describes every lesson as it stands.");
    return 0;
  }
  const key = apiKey();
  if (!key) {
    return fail(`${todo.length} lessons are not described as they stand, and there is no ANTHROPIC_API_KEY to describe them with. Run /syllabus in Claude Code, or set the key.`);
  }
  console.log(`Describing ${todo.length} lessons through the Claude API: ${todo.join(", ")}`);
  const client = new Anthropic({ apiKey: key });
  const guide = readFileSync(GUIDE_PATH, "utf8");
  // One outline for the whole run, so every request shares a cached prefix.
  const outline = course(syllabus);
  const used = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
  const failures: string[] = [];
  const queue = [...todo];
  const worker = async (): Promise<void> => {
    for (let slug = queue.shift(); slug; slug = queue.shift()) {
      const message = await client.beta.messages.create(entryParams(guide, outline, slug, filesOf(slug)));
      used.input += message.usage.input_tokens;
      used.cacheRead += message.usage.cache_read_input_tokens ?? 0;
      used.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;
      used.output += message.usage.output_tokens;
      const written = writtenOf(message, slug);
      if ("error" in written) {
        failures.push(written.error);
        continue;
      }
      syllabus[slug] = { source: hashOf(slug), ...written };
      save(syllabus);
      console.log(`  ${slug}`);
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));
  console.log(
    `Tokens: ${used.input} input, ${used.cacheWrite} written to cache, ${used.cacheRead} read from cache, ${used.output} output.`,
  );
  for (const failure of failures) console.error(failure);
  if (failures.length > 0) return 1;
  console.log("Commit src/recall/syllabus.json with the rest.");
  return report(syllabus);
}

async function main(args: string[]): Promise<number> {
  const [command, ...slugs] = args;
  const syllabus = load();
  switch (command) {
    case "status": {
      const { missing, changed } = stale(syllabus, hashes());
      const fresh = lessons.length - missing.length - changed.length;
      console.log(`${fresh} of ${lessons.length} lessons described and up to date.`);
      for (const [label, list] of [["Not yet described", missing], ["Changed since described", changed]] as const) {
        if (list.length === 0) continue;
        console.log(`\n${label} (${list.length}):`);
        for (const slug of list) console.log(`  ${slug}: ${sourcesOf(slug).join(", ")}`);
      }
      return 0;
    }
    case "stamp": {
      if (slugs.length === 0) return fail("Name the lessons to stamp.");
      for (const slug of slugs) {
        const entry = syllabus[slug];
        if (!entry) return fail(`${slug} has no entry to stamp. Write it first.`);
        entry.source = hashOf(slug);
      }
      save(syllabus);
      console.log(`Stamped ${slugs.join(", ")}.`);
      return report(syllabus);
    }
    case "check":
      return report(syllabus);
    case "refresh":
      return refresh();
    default:
      return fail("Use: node tools/syllabus.ts status | stamp <slug>... | check | refresh");
  }
}

function report(syllabus: Syllabus): number {
  const found = problems(syllabus, lessons.map((l) => l.slug));
  for (const problem of found) console.error(problem);
  return found.length === 0 ? 0 : 1;
}

function fail(message: string): number {
  console.error(message);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (error: unknown) => {
      console.error(error instanceof Anthropic.APIError ? `The Claude API answered ${error.status}: ${error.message}` : error);
      process.exitCode = 1;
    },
  );
}
