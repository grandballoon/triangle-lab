// The sign-in page (signin.html): draws the view signin.ts decides, and makes
// its requests to the Worker's /auth/* (worker/auth.ts).

import "../recall/sheet.css";
import "../recall/page.css";
import "./signin.css";
import { afterLink, afterRedeem, afterSignOut, afterWho, initialView, type Answer, type View } from "./signin.ts";

const root = document.getElementById("signin")!;
// The site's root, as built (vite.config.ts `base`).
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, "");

let view: View = initialView(location.search);
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
  view = next;
  root.replaceChildren(...draw(next));
  root.querySelector<HTMLElement>("[data-focus]")?.focus();
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
      return [lead, note, row];
    }
  }
}

show(view);
if (view.kind === "busy") void ask("GET", "/auth/session").then((answer) => show(afterWho(answer)));
