// @vitest-environment jsdom
//
// The AR page's chrome against a DOM stand-in: the step card shows the stage
// on the sheet and steps between them, the pose panel's sliders write the
// pose and follow it, and the lab page links to AR only for the lessons the
// AR page takes.

import { describe, expect, it } from "vitest";
import build from "../lab/lessons/tangent-chord.ts";
import { Scene } from "../lab/scene.ts";
import { StepCard } from "./card.ts";
import { dials } from "./dials.ts";
import { arLessons, arSlugOf } from "./lessons.ts";
import { mountArLink } from "./link.ts";
import { PosePanel, type PanelState } from "./panel.ts";
import { initialPose, type Pose } from "./pose.ts";

const el = <T extends HTMLElement>(tag: string): T => document.createElement(tag) as T;

describe("StepCard", () => {
  const steps = build(new Scene("#fb923c")).steps;

  function mount() {
    const parts = {
      count: el("span"),
      title: el("h2"),
      text: el("p"),
      stages: el("div"),
      readouts: el("div"),
      prev: el<HTMLButtonElement>("button"),
      next: el<HTMLButtonElement>("button"),
    };
    const asked: number[] = [];
    const card = new StepCard(parts, (to) => asked.push(to));
    card.show(steps);
    return { parts, card, asked };
  }

  it("shows the stage on the sheet, with a button for each", () => {
    const { parts, card } = mount();
    card.mark(1);
    expect(parts.count.textContent).toBe(`Stage 2 of ${steps.length}`);
    expect(parts.title.textContent).toBe(steps[1].title);
    expect(parts.text.querySelector(".katex")).not.toBeNull();
    const pressed = [...parts.stages.children].map((b) => b.getAttribute("aria-pressed"));
    expect(pressed.indexOf("true")).toBe(1);
    expect(pressed.filter((p) => p === "true")).toHaveLength(1);
  });

  it("asks for the stage before, after, or pressed, and stops at the ends", () => {
    const { parts, card, asked } = mount();
    card.mark(0);
    expect(parts.prev.disabled).toBe(true);
    parts.next.click();
    (parts.stages.children[4] as HTMLButtonElement).click();
    card.mark(steps.length - 1);
    expect(parts.next.disabled).toBe(true);
    parts.prev.click();
    expect(asked).toEqual([1, 4, steps.length - 2]);
  });

  it("typesets the formulas, and leaves them be while they hold still", () => {
    const { parts, card } = mount();
    card.readouts([{ label: "Half the arc", tex: "\\tfrac12 = 1", tone: "good" }]);
    const row = parts.readouts.firstElementChild!;
    expect(row.className).toContain("tone-good");
    expect(row.querySelector(".katex")).not.toBeNull();
    card.readouts([{ label: "Half the arc", tex: "\\tfrac12 = 1", tone: "good" }]);
    expect(parts.readouts.firstElementChild).toBe(row);
  });
});

describe("PosePanel", () => {
  function mount() {
    const root = el("section");
    const toggle = el<HTMLButtonElement>("button");
    const body = el("div");
    root.hidden = true;
    let state: PanelState = {
      pose: initialPose({ width: 1200, height: 800 }, { width: 960, height: 600 }),
      mode: "move",
      backed: true,
    };
    const panel = new PosePanel(
      root,
      toggle,
      body,
      {
        pose: (change: (p: Pose) => Pose) => (state = { ...state, pose: change(state.pose) }),
        mode: (mode) => (state = { ...state, mode }),
        backed: (backed) => (state = { ...state, backed }),
        face: () => {},
        reset: () => {},
      },
      false,
    );
    panel.show(state);
    return { root, toggle, body, panel, get: () => state };
  }

  it("starts folded when asked, and unfolds from its header", () => {
    const { root, toggle, body } = mount();
    expect(root.hidden).toBe(false);
    expect(body.hidden).toBe(true);
    toggle.click();
    expect(body.hidden).toBe(false);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("writes a slider into the pose, and follows the pose otherwise", () => {
    const { body, panel, get } = mount();
    const inputs = [...body.querySelectorAll<HTMLInputElement>("input[type=range]")];
    expect(inputs).toHaveLength(dials.length);
    const tilt = inputs[dials.findIndex((d) => d.key === "tilt")];
    expect(Number(tilt.value)).toBeCloseTo(30);
    tilt.value = "-20";
    tilt.dispatchEvent(new Event("input"));
    expect(get().pose.tilt).toBeCloseTo((-20 * Math.PI) / 180);
    tilt.dispatchEvent(new Event("change"));
    panel.show({ ...get(), pose: { ...get().pose, tilt: 0.5 } });
    expect(Number(tilt.value)).toBeCloseTo((0.5 * 180) / Math.PI, 0);
  });

  it("picks what dragging does, and whether the sheet is backed", () => {
    const { body, panel, get } = mount();
    const chips = [...body.querySelectorAll<HTMLButtonElement>(".chip")];
    chips.find((c) => c.textContent === "Lean")!.click();
    chips.find((c) => c.textContent === "Sheet")!.click();
    expect(get().mode).toBe("lean");
    expect(get().backed).toBe(false);
    panel.show(get());
    expect(chips.find((c) => c.textContent === "Lean")!.getAttribute("aria-pressed")).toBe("true");
    expect(chips.find((c) => c.textContent === "Sheet")!.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("dials", () => {
  it("read back what they write", () => {
    const pose = initialPose({ width: 1200, height: 800 }, { width: 960, height: 600 });
    for (const dial of dials) {
      const v = (dial.min + dial.max) / 3;
      expect(dial.read(dial.write(pose, v))).toBeCloseTo(v);
    }
  });
});

describe("the way into AR", () => {
  it("is shown on the lab page only for the lessons the AR page takes", () => {
    const topbar = el("header");
    const show = mountArLink(topbar);
    const link = topbar.querySelector<HTMLAnchorElement>(".nav-ar")!;
    show("tangent-chord");
    expect(link.hidden).toBe(false);
    expect(link.getAttribute("href")).toBe("ar.html?lesson=tangent-chord");
    show("inscribed-angle");
    expect(link.hidden).toBe(true);
  });

  it("opens the lesson asked for, the first by default, and no other", () => {
    expect(arSlugOf("?lesson=tangent-chord")).toBe("tangent-chord");
    expect(arSlugOf("")).toBe(arLessons[0]);
    expect(arSlugOf("?lesson=inscribed-angle")).toBeNull();
  });
});
