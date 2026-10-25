// What Enter does in the recall text boxes, with a keyboard and on a phone.

import { describe, expect, it } from "vitest";
import { submitsOnEnter } from "./keys.ts";

const press = (key: string, shiftKey = false, isComposing = false) => ({ key, shiftKey, isComposing });

describe("submitsOnEnter", () => {
  it("saves on Enter with a keyboard, and leaves Shift+Enter for a new line", () => {
    expect(submitsOnEnter(press("Enter"), false)).toBe(true);
    expect(submitsOnEnter(press("Enter", true), false)).toBe(false);
  });

  it("never saves on Enter from a touch screen, whose keyboard has no Shift+Enter", () => {
    expect(submitsOnEnter(press("Enter"), true)).toBe(false);
  });

  it("leaves Enter to an input method still composing, and other keys alone", () => {
    expect(submitsOnEnter(press("Enter", false, true), false)).toBe(false);
    expect(submitsOnEnter(press("a"), false)).toBe(false);
  });
});
