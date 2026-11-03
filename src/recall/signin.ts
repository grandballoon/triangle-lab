// Signing in to the site again once its Cloudflare Access sign-in has run
// out (sync.ts). Access renews a sign-in only on a page being opened, never
// on a page's own requests, so the link opens signin.html in a new tab: Access
// signs the learner in on the way, without asking while its longer sign-in
// to the team still holds, and the page closes itself once it is open. The
// tab the learner came from keeps everything they wrote; on getting the
// focus back it syncs (remote.ts), and checks and readings can be asked for
// again.

/** Where Access signs the learner in again, relative to the site's root. */
export const SIGN_IN_PAGE = "signin.html";

/** A link that signs the learner in again in a new tab. */
export function signInLink(doc: Document, className: string): HTMLAnchorElement {
  const link = doc.createElement("a");
  link.className = className;
  link.href = SIGN_IN_PAGE;
  link.target = "_blank";
  link.textContent = "Sign in again ↗";
  return link;
}
