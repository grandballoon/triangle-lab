// How a signed-in learner's calls to Claude are paid for, as their account
// page (signin.html) shows it, and what each reply from the Worker's
// /account (worker/billing.ts) turns that into. page.ts makes the requests
// and draws it.
//
// The owner's calls go on the site's key. Everyone else's come out of their
// beta credit, until they save a Claude API key of their own, which the
// Worker keeps encrypted and never sends back: the page only ever sees its
// last four characters.
//
// Pure, and shared with the Worker, so both read an account by the same rules.

import { problem, type Answer } from "./signin.ts";

/** Where the account is read (GET), a key saved (PUT) and removed (DELETE). */
export const ACCOUNT_PATH = "/account";

/**
 * The status the Worker refuses a call to Claude with when the account page
 * can mend it: no beta credit left, or the learner's own key turned down.
 * The recall page links to the account page beside the error (src/recall/check.ts).
 */
export const ACCOUNT_STATUS = 402;

/** How a learner's calls are paid for. */
export type ClaudeAccount =
  /** The owner: the site's key, unmetered. */
  | { kind: "owner" }
  /** Their own Claude API key, ending in `hint`. */
  | { kind: "own-key"; hint: string }
  /** Beta credit on the site's key: given and spent, in millionths of a dollar. */
  | { kind: "credit"; granted: number; spent: number };

/** The account section of the page. */
export type AccountView =
  | { kind: "loading" }
  | { kind: "failed"; error: string }
  /** `busy` while a key is being saved or removed; `error` from the last try. */
  | { kind: "shown"; account: ClaudeAccount; busy: boolean; error: string | null };

/** Read an account as the Worker sends it, or null when `raw` is not one. */
export function readAccount(raw: unknown): ClaudeAccount | null {
  if (typeof raw !== "object" || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (a.kind === "owner") return { kind: "owner" };
  if (a.kind === "own-key" && typeof a.hint === "string") return { kind: "own-key", hint: a.hint };
  if (a.kind === "credit" && isAmount(a.granted) && isAmount(a.spent)) return { kind: "credit", granted: a.granted, spent: a.spent };
  return null;
}

/** After reading the account. */
export function afterAccount(answer: Answer): AccountView {
  const account = answer && answer.status === 200 ? readAccount(answer.body) : null;
  return account ? { kind: "shown", account, busy: false, error: null } : { kind: "failed", error: problem(answer) };
}

/** After saving or removing a key, from `before`, the view the request was made from. */
export function afterKeyChange(answer: Answer, before: AccountView): AccountView {
  const account = answer && answer.status === 200 ? readAccount(answer.body) : null;
  if (account) return { kind: "shown", account, busy: false, error: null };
  return before.kind === "shown" ? { ...before, busy: false, error: problem(answer) } : { kind: "failed", error: problem(answer) };
}

/** Millionths of a dollar as dollars and cents, "$4.50": rounded down, so credit left is never overstated. */
export function dollars(micros: number): string {
  const cents = Math.floor(Math.max(0, micros) / 10_000);
  return `$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

/** What the page says about beta credit: "$3.40 of $5.00 beta credit left." */
export function creditLine(account: Extract<ClaudeAccount, { kind: "credit" }>): string {
  return `${dollars(account.granted - account.spent)} of ${dollars(account.granted)} beta credit left.`;
}

/** What the account page says of how calls are paid for: a lead line, and a note under it. */
export function accountText(account: ClaudeAccount): { lead: string; note: string } {
  switch (account.kind) {
    case "owner":
      return { lead: "Your calls to Claude go on the site's own key.", note: "Save a key of your own to have them billed to you instead." };
    case "own-key":
      return { lead: `Claude is paid for with your own API key, ending in ${account.hint}.`, note: "It's kept encrypted, and used only to have Claude check your work here." };
    case "credit":
      if (account.granted === 0) return { lead: "Add your Claude API key to have Claude check your work.", note: "Calls to Claude are billed to your key." };
      return {
        lead: creditLine(account),
        note:
          account.spent >= account.granted
            ? "Add your own Claude API key to have Claude keep checking your work."
            : "Claude's checks of your answers and writing come out of it, a few cents each. Add your own Claude API key to use that instead.",
      };
  }
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
