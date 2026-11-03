// Which lab lessons can be shown on the AR page (ar.html), and where. Any lab
// lesson would draw there unchanged; one is listed while the page is tried
// out, and more are opened to it by adding their slugs.

export const arLessons: readonly string[] = ["tangent-chord"];

export const hasAr = (slug: string): boolean => arLessons.includes(slug);

/** The AR page for a lesson. */
export const arHrefOf = (slug: string): string => `ar.html?lesson=${slug}`;

/** The lesson an AR page's address asks for, if it is one the page shows. */
export function arSlugOf(search: string): string | null {
  const slug = new URLSearchParams(search).get("lesson") ?? arLessons[0];
  return hasAr(slug) ? slug : null;
}
