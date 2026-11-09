// The sign-in page (signin.html), as plain values: what it shows, and what
// each reply from the Worker (worker/auth.ts) turns that into. page.ts makes
// the requests and draws the view.
//
// Opened plainly, the page asks who is signed in: someone is, and it says so
// and offers to sign out; no one is, and it asks for an email address to send
// a sign-in link to. Opened from that link, it carries the link's token, and
// a button trades it for a session: a button, not on opening, so a mail
// scanner that opens links ahead of the learner cannot spend it.

export type View =
  /** Waiting on the Worker. */
  | { kind: "busy"; text: string }
  /** Asking for the address to send a link to. */
  | { kind: "ask"; email: string; error: string | null }
  /** A link was sent, if the address is invited; the Worker never says which. */
  | { kind: "sent"; email: string }
  /** Opened from a sign-in link: the button that uses it. */
  | { kind: "redeem"; token: string; error: string | null }
  | { kind: "signed-in"; email: string; justNow: boolean };

/** A reply as the page reads it: its status and parsed body, or null when there was none, as offline. */
export type Answer = { status: number; body: unknown } | null;

/** Where the page starts, from its query string. */
export function initialView(search: string): View {
  const token = new URLSearchParams(search).get("token");
  return token ? { kind: "redeem", token, error: null } : { kind: "busy", text: "Checking whether you're signed in…" };
}

/** After asking who is signed in. */
export function afterWho(answer: Answer): View {
  const email = emailIn(answer);
  if (answer?.status === 200 && email) return { kind: "signed-in", email, justNow: false };
  if (answer?.status === 401) return { kind: "ask", email: "", error: null };
  return { kind: "ask", email: "", error: problem(answer) };
}

/** After asking for a link to be sent to `email`. */
export function afterLink(answer: Answer, email: string): View {
  if (answer?.status === 202) return { kind: "sent", email };
  return { kind: "ask", email, error: problem(answer) };
}

/** After trading the link's `token` for a session. */
export function afterRedeem(answer: Answer, token: string): View {
  const email = emailIn(answer);
  if (answer?.status === 200 && email) return { kind: "signed-in", email, justNow: true };
  // A spent or expired link is no use again: ask for another.
  if (answer?.status === 400 || answer?.status === 403) return { kind: "ask", email: "", error: problem(answer) };
  return { kind: "redeem", token, error: problem(answer) };
}

/** After signing out. */
export function afterSignOut(answer: Answer, email: string): View {
  return answer?.status === 200 ? { kind: "ask", email: "", error: null } : { kind: "signed-in", email, justNow: false };
}

/** What went wrong, in a sentence. */
export function problem(answer: Answer): string {
  if (!answer) return "Can't reach the site. Check your connection and try again.";
  const body = answer.body;
  const said = typeof body === "object" && body !== null && "error" in body ? String(body.error) : "";
  return said || `Something went wrong (${answer.status}). Try again.`;
}

function emailIn(answer: Answer): string | null {
  const body = answer?.body;
  return typeof body === "object" && body !== null && "email" in body && typeof body.email === "string" ? body.email : null;
}
