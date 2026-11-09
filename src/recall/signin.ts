// The link to sign in (signin.html, src/auth), from wherever a page finds the
// learner signed out (sync.ts). It opens in a new tab, so the tab the learner
// came from keeps everything they wrote; on getting the focus back it syncs
// (remote.ts), and checks and readings can be asked for again.

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
