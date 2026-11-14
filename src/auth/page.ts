// The sign-in page (signin.html), which is the learner's account page once
// they are signed in: draws the views signin.ts and account.ts decide, and
// makes their requests to the Worker's /auth/* (worker/auth.ts) and /account
// (worker/billing.ts).

import "../recall/sheet.css";
import "../recall/page.css";
import "./signin.css";
import { ACCOUNT_PATH, accountText, afterAccount, afterKeyChange, type AccountView } from "./account.ts";
import { afterLink, afterRedeem, afterSignOut, afterWho, headingOf, initialView, type Answer, type View } from "./signin.ts";

const root = document.getElementById("signin")!;
const heading = document.querySelector("h1")!;
/** Where to make a Claude API key. */
const CONSOLE_KEYS = "https://console.anthropic.com/settings/keys";
// The site's root, as built (vite.config.ts `base`).
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

let view: View = initialView(location.search);
/** How the signed-in learner's calls to Claude are paid for; read afresh on each signing in. */
let account: AccountView = { kind: "loading" };
// The token is in the address only to reach this page; keep it out of history.
if (view.kind === "redeem") history.replaceState(null, "", location.pathname);

async function ask(method: string, path: string, body?: unknown): Promise<Answer> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
      credentials: "same-origin",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  } catch {
    return null;
  }
}

function show(next: View): void {
  const signingIn = next.kind === "signed-in" && view.kind !== "signed-in";
  view = next;
  if (signingIn) {
    account = { kind: "loading" };
    void ask("GET", ACCOUNT_PATH).then((answer) => showAccount(afterAccount(answer)));
  }
  heading.textContent = headingOf(next);
  document.title = `${headingOf(next)} · Triangle Lab`;
  root.replaceChildren(...draw(next));
  root.querySelector<HTMLElement>("[data-focus]")?.focus();
}

function showAccount(next: AccountView): void {
  account = next;
  if (view.kind === "signed-in") root.querySelector(".si-account")?.replaceWith(drawAccount(next));
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text) node.textContent = text;
  return node;
}

function button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el("button", `rc-button ${cls}`.trim(), label);
  b.type = "button";
  b.addEventListener("click", onClick);
  return b;
}

function error(text: string | null): HTMLElement[] {
  return text ? [el("p", "rc-notice rc-error", text)] : [];
}

function draw(v: View): HTMLElement[] {
  switch (v.kind) {
    case "busy":
      return [el("p", "rc-note", v.text)];
    case "ask": {
      const form = el("form", "si-form");
      const input = el("input", "rc-input");
      input.type = "email";
      input.autocomplete = "email";
      input.required = true;
      input.placeholder = "you@example.com";
      input.setAttribute("aria-label", "Email address");
      input.value = v.email;
      input.dataset.focus = "";
      const send = el("button", "rc-button rc-primary", "Email me a link");
      send.type = "submit";
      form.append(input, send);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const email = input.value.trim();
        show({ kind: "busy", text: "Sending…" });
        void ask("POST", "/auth/link", { email }).then((answer) => show(afterLink(answer, email)));
      });
      return [el("p", "rc-note", "Enter your email address, and we'll send you a link that signs you in."), form, ...error(v.error)];
    }
    case "sent": {
      const lead = el("p", "si-lead");
      lead.append("Check your email. If ", el("strong", "", v.email), " is invited, a sign-in link is on its way.");
      const row = el("div", "rc-row");
      row.append(button("Use another address", "rc-small", () => show({ kind: "ask", email: v.email, error: null })));
      return [lead, el("p", "rc-note", "It works once, for the next 15 minutes. Open it on this device to sign in here."), row];
    }
    case "redeem": {
      const go = button("Finish signing in", "rc-primary", () => {
        show({ kind: "busy", text: "Signing in…" });
        void ask("POST", "/auth/session", { token: v.token }).then((answer) => show(afterRedeem(answer, v.token)));
      });
      go.dataset.focus = "";
      const row = el("div", "rc-row");
      row.append(go);
      return [el("p", "rc-note", "You opened a sign-in link."), row, ...error(v.error)];
    }
    case "signed-in": {
      const lead = el("p", "si-lead");
      lead.append(v.justNow ? "You're signed in as " : "Signed in as ", el("strong", "", v.email), ".");
      const note = el("p", "rc-note", v.justNow ? "Your questions now sync to every device you sign in on. Any tab you left open picks up where you were." : "");
      const row = el("div", "rc-row");
      const lessons = el("a", "rc-source", "Go to the lessons");
      lessons.href = "index.html";
      row.append(
        lessons,
        button("Sign out", "rc-small", () => {
          show({ kind: "busy", text: "Signing out…" });
          void ask("DELETE", "/auth/session").then((answer) => show(afterSignOut(answer, v.email)));
        }),
      );
      return [lead, note, row, drawAccount(account)];
    }
  }
}

/** How calls to Claude are paid for, and the form to save or remove a key of the learner's own. */
function drawAccount(a: AccountView): HTMLElement {
  const section = el("section", "si-account");
  section.setAttribute("aria-labelledby", "si-account-head");
  const head = el("h2", "", "Claude");
  head.id = "si-account-head";
  section.append(head);
  if (a.kind === "loading") {
    section.append(el("p", "rc-note", "Loading…"));
    return section;
  }
  if (a.kind === "failed") {
    section.append(...error(a.error));
    return section;
  }
  const { lead, note } = accountText(a.account);
  section.append(el("p", "si-account-lead", lead), el("p", "rc-note", note));

  const form = el("form", "si-form");
  const input = el("input", "rc-input");
  input.type = "password";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.required = true;
  input.placeholder = "sk-ant-…";
  input.setAttribute("aria-label", "Your Claude API key");
  const save = el("button", "rc-button rc-primary", a.account.kind === "own-key" ? "Replace key" : "Save key");
  save.type = "submit";
  save.disabled = a.busy;
  input.disabled = a.busy;
  form.append(input, save);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const before: AccountView = { ...a, busy: false };
    showAccount({ ...a, busy: true, error: null });
    void ask("PUT", ACCOUNT_PATH, { key: input.value }).then((answer) => showAccount(afterKeyChange(answer, before)));
  });
  section.append(form);

  const where = el("p", "rc-note");
  const make = el("a", "si-link", "Claude Console");
  make.href = CONSOLE_KEYS;
  make.target = "_blank";
  make.rel = "noopener";
  where.append("Make a key in the ", make, ". It's kept encrypted, and never shown again.");
  section.append(where);

  if (a.account.kind === "own-key") {
    const row = el("div", "rc-row");
    const remove = button("Remove key", "rc-small", () => {
      const before: AccountView = { ...a, busy: false };
      showAccount({ ...a, busy: true, error: null });
      void ask("DELETE", ACCOUNT_PATH).then((answer) => showAccount(afterKeyChange(answer, before)));
    });
    remove.disabled = a.busy;
    row.append(remove);
    section.append(row);
  }
  section.append(...error(a.error));
  return section;
}

show(view);
if (view.kind === "busy") void ask("GET", "/auth/session").then((answer) => show(afterWho(answer)));
