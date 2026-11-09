// The link to sign in (signin.html, src/auth), from wherever a page finds the
// learner signed out (sync.ts), and to their account there, from wherever a
// call to Claude was refused for want of credit or of a working key of their
// own. Each opens in a new tab, so the tab the learner came from keeps
// everything they wrote; on getting the focus back it syncs (remote.ts), and
// checks and readings can be asked for again.

import type { Mend } from "./check.ts";

/** Where the learner signs in, relative to the site's root. */
export const SIGN_IN_PAGE = "signin.html";

/** A link that opens the sign-in page in a new tab. */
export function signInLink(doc: Document, className: string): HTMLAnchorElement {
  const link = doc.createElement("a");
  link.className = className;
  link.href = SIGN_IN_PAGE;
  link.target = "_blank";
  link.textContent = "Sign in ↗";
  return link;
}

/** A link that opens the page that mends `mend` in a new tab. */
export function mendLink(doc: Document, mend: Mend, className: string): HTMLAnchorElement {
  const link = signInLink(doc, className);
  if (mend === "account") link.textContent = "Your account ↗";
  return link;
}
