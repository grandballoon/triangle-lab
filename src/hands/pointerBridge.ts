// Makes a hand look like a pointer. Each tracked hand becomes a synthetic
// pointer: moving it sends `pointermove`, closing the grab sends
// `pointerdown`, opening it sends `pointerup` — and a grab that starts and
// ends on the same button or link clicks it. Pages therefore need no hand
// code at all: anything that works with a mouse works with a hand.
//
// Events are dispatched directly at the element under the cursor and, during
// a grab, at the element the grab started on, which stands in for pointer
// capture (see src/pointer.ts).

import type { XY } from "./pose.ts";

export type HandKey = "left" | "right";

/** `pointerType` of every event this bridge dispatches. */
export const HAND_POINTER_TYPE = "hand";

const POINTER_ID: Record<HandKey, number> = { left: 9001, right: 9002 };
const CLICKABLE = "a[href], button, [role='button'], label, summary";
const HOVER_CLASS = "hand-hover";

interface Session {
  /** Element the grab started on, while grabbing. */
  target: Element | null;
  hovered: Element | null;
}

export class PointerBridge {
  private readonly sessions = new Map<HandKey, Session>();
  /** In single-pointer mode, the hand that currently holds the button. */
  private owner: HandKey | null = null;

  /**
   * @param multi Whether two hands may press at once. Pages written around a
   *   single drag pass false, and the second hand then only hovers.
   */
  constructor(private readonly multi: boolean) {}

  update(key: HandKey, cursor: XY, grab: { started: boolean; ended: boolean; active: boolean }): void {
    const s = this.session(key);
    const blocked = !this.multi && this.owner !== null && this.owner !== key;

    if (grab.started && !blocked) {
      s.target = document.elementFromPoint(cursor.x, cursor.y);
      this.owner = key;
      if (s.target) dispatch(s.target, "pointerdown", key, cursor, 1);
    } else if (grab.active && s.target) {
      dispatch(s.target, "pointermove", key, cursor, 1);
    } else if (grab.ended && s.target) {
      this.release(key, cursor);
    } else if (!blocked && !s.target) {
      const under = document.elementFromPoint(cursor.x, cursor.y);
      if (under) dispatch(under, "pointermove", key, cursor, 0);
      this.hover(s, under?.closest(CLICKABLE) ?? null);
    }
  }

  /** The hand left the frame: let go of whatever it held. */
  drop(key: HandKey, lastCursor: XY): void {
    const s = this.sessions.get(key);
    if (!s) return;
    if (s.target) {
      dispatch(s.target, "pointercancel", key, lastCursor, 0);
      s.target = null;
      if (this.owner === key) this.owner = null;
    }
    this.hover(s, null);
    this.sessions.delete(key);
  }

  private release(key: HandKey, cursor: XY): void {
    const s = this.session(key);
    const target = s.target!;
    s.target = null;
    if (this.owner === key) this.owner = null;
    dispatch(target, "pointerup", key, cursor, 0);

    // Press and release on the same control is a click, as with a mouse.
    const pressed = target.closest(CLICKABLE);
    const under = document.elementFromPoint(cursor.x, cursor.y);
    if (pressed instanceof HTMLElement && under?.closest(CLICKABLE) === pressed) pressed.click();
  }

  private hover(s: Session, next: Element | null): void {
    if (s.hovered === next) return;
    s.hovered?.classList.remove(HOVER_CLASS);
    next?.classList.add(HOVER_CLASS);
    s.hovered = next;
  }

  private session(key: HandKey): Session {
    let s = this.sessions.get(key);
    if (!s) {
      s = { target: null, hovered: null };
      this.sessions.set(key, s);
    }
    return s;
  }
}

function dispatch(target: Element, type: string, key: HandKey, at: XY, buttons: number): void {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerId: POINTER_ID[key],
      pointerType: HAND_POINTER_TYPE,
      isPrimary: true,
      clientX: at.x,
      clientY: at.y,
      button: type === "pointermove" ? -1 : 0,
      buttons,
    }),
  );
}
