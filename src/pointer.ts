// Pointer capture that tolerates synthetic pointers. A lesson captures the
// pointer so a drag keeps arriving after the cursor leaves the canvas; the
// browser only allows that for real, active pointers. Hand input (src/hands)
// dispatches its own PointerEvents straight at the grabbed element, so those
// need no capture — and asking for it would throw.

export function capturePointer(el: Element, e: PointerEvent): void {
  if (e.isTrusted) el.setPointerCapture(e.pointerId);
}

export function releasePointer(el: Element, e: PointerEvent): void {
  if (e.isTrusted && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
}
