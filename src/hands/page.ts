// Hand input for the standalone lesson pages. Each one loads this as an extra
// module script, the same way it loads the pager, so the lesson's own entry
// point stays about geometry: it listens for pointer events and never learns
// whether a mouse or a hand sent them.
//
// These pages are each built around a single drag, so one hand presses at a
// time, and they have no steps for the pose actions to drive.

import { startHands } from "./index.ts";

startHands({
  video: document.getElementById("cam") as HTMLVideoElement,
  multiPointer: false,
});
