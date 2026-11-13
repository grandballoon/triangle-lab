// Which lesson a page shows, for the dev tools that work on a lesson's text:
// the copy editor (dev/copy) and the draft tab (dev/drafts). Shared by the
// page, the dev server and the staging Worker, so it stays free of DOM and
// Node APIs.

/** A lesson's slug (lessons.ts): safe as a file name. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Pages with no lesson of their own. */
const NOT_LESSONS = new Set(["index", "recall", "signin", "ar"]);

/** The lesson `page` (path and query) shows, or null for a page that shows none. */
export function lessonOf(page: string): { slug: string; lab: boolean } | null {
  let url: URL;
  try {
    url = new URL(page, "http://dev");
  } catch {
    return null;
  }
  const name = (url.pathname.split("/").pop() ?? "").replace(/\.html$/, "");
  if (name === "lab") {
    const slug = url.searchParams.get("lesson") ?? "";
    return SLUG.test(slug) ? { slug, lab: true } : null;
  }
  return SLUG.test(name) && !NOT_LESSONS.has(name) ? { slug: name, lab: false } : null;
}
