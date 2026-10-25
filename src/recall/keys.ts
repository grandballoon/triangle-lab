// What Enter does in the recall text boxes. With a keyboard, Enter saves (or
// checks) and Shift+Enter starts a new line. A phone's keyboard has no
// Shift+Enter, so on a touch screen Enter only ever starts a new line and the
// buttons save.

/** Whether this keydown should save the box rather than type into it. */
export function submitsOnEnter(e: Pick<KeyboardEvent, "key" | "shiftKey" | "isComposing">, touch: boolean): boolean {
  return e.key === "Enter" && !e.shiftKey && !e.isComposing && !touch;
}

/** Whether the main pointer is a finger, so there is likely no hardware keyboard. */
export function touchFirst(): boolean {
  return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
}
