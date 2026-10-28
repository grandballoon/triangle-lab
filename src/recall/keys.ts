// What Enter does in the recall text boxes. With a keyboard, Enter saves (or
// checks) and Shift+Enter starts a new line. A phone's keyboard has no
// Shift+Enter, so on a touch screen Enter only ever starts a new line and the
// buttons save. In a free association, which runs to many lines, Enter is
// always a new line, and Command- or Control-Enter has it read.

/** Whether this keydown should save the box rather than type into it. */
export function submitsOnEnter(e: Pick<KeyboardEvent, "key" | "shiftKey" | "isComposing">, touch: boolean): boolean {
  return e.key === "Enter" && !e.shiftKey && !e.isComposing && !touch;
}

/** Whether the main pointer is a finger, so there is likely no hardware keyboard. */
export function touchFirst(): boolean {
  return typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
}

/** Whether this keydown in a long piece of writing should have it read, rather than start a new line. */
export function submitsOnModEnter(e: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "isComposing">): boolean {
  return e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.isComposing;
}
