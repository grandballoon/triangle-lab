// Starts the webcam and pipes it into the background <video>. If the camera is
// unavailable or denied we just fall back to the dark background — the lesson
// still works, it simply loses the "manipulate math over your own image" feel.
//
// A device with more than one camera can switch between them (cameraSwitch.ts):
// on a phone, from the selfie camera to the one on the back, so the figure
// sits over the room around you. The choice is remembered, so the next lesson
// page opens the same camera.
//
// The camera can also be turned off altogether (`camera.set(false)`), leaving
// the figures on a plain background; that too is remembered, and a page
// opened with the camera off never asks for it.
//
// A camera facing the user is shown mirrored, like a mirror; one facing away
// is shown as it is. The video carries which as `data-mirror`, and the page's
// stylesheet mirrors it by default, so an unmirrored camera clears the
// transform inline. Hand tracking reads the same attribute (hands/tracker.ts).

/** A camera to open: by the way it faces (a phone's two) or by device (any other). */
export type CameraChoice = { facing: "user" | "environment" } | { deviceId: string };

/** The camera open now, as its track reports it. */
export interface OpenCamera {
  deviceId: string | null;
  facing: string | null;
}

const DEFAULT: CameraChoice = { facing: "user" };
const STORAGE_KEY = "triangle-lab:camera";
const OFF_KEY = "triangle-lab:camera-off";

/**
 * What to try, in order, when the user asks for the next camera. A camera
 * that says which way it faces flips to the other way; when that fails (a
 * laptop's webcam may call itself "user" with no camera behind it) or the
 * camera does not say, the next of the device's cameras is tried.
 */
export function nextCameras(open: OpenCamera, deviceIds: readonly string[]): CameraChoice[] {
  const tries: CameraChoice[] = [];
  if (open.facing === "user") tries.push({ facing: "environment" });
  else if (open.facing === "environment") tries.push({ facing: "user" });
  const others = deviceIds.filter((id) => id !== open.deviceId);
  if (others.length > 0) {
    const at = open.deviceId ? deviceIds.indexOf(open.deviceId) : -1;
    tries.push({ deviceId: at === -1 ? others[0] : deviceIds[(at + 1) % deviceIds.length] });
  }
  return tries;
}

/** Whether a camera facing this way is shown mirrored. Unknown is taken to face the user. */
export function mirrored(facing: string | null): boolean {
  return facing !== "environment";
}

let video: HTMLVideoElement | null = null;
let stream: MediaStream | null = null;
let current: OpenCamera = { deviceId: null, facing: null };
let switching: Promise<boolean> | null = null;
let on = readOn();
const listeners = new Set<() => void>();

export async function startWebcam(target: HTMLVideoElement): Promise<boolean> {
  video = target;
  return on ? openPreferred() : false;
}

/** Whether the camera is on, and the switch that turns it on and off. */
export const camera = {
  on: (): boolean => on,
  async set(next: boolean): Promise<void> {
    if (next === on) return;
    on = next;
    writeOn(next);
    if (next) {
      await openPreferred();
    } else {
      close();
      if (video) video.srcObject = null;
    }
    notify();
  },
  subscribe: (fn: () => void): void => onCameraChange(fn),
};

function openPreferred(): Promise<boolean> {
  const preferred = readPreferred();
  return open(preferred ? [preferred, DEFAULT] : [DEFAULT]);
}

/**
 * Open the next camera, if there is another, going back to this one if none
 * will open. True when the camera changed. A press while a switch is under
 * way waits for it rather than starting another.
 */
export function switchCamera(): Promise<boolean> {
  if (!on) return Promise.resolve(false);
  switching ??= (async () => {
    const was = current;
    const tries = nextCameras(was, await cameraIds());
    if (tries.length === 0) return false;
    const back: CameraChoice = was.deviceId ? { deviceId: was.deviceId } : DEFAULT;
    return (await open([...tries, back])) && current.deviceId !== was.deviceId;
  })().finally(() => (switching = null));
  return switching;
}

/** The device ids of every camera the page may open. */
export async function cameraIds(): Promise<string[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput").map((d) => d.deviceId);
  } catch {
    return [];
  }
}

/** Call `fn` whenever a camera opens, or the camera is turned on or off. */
export function onCameraChange(fn: () => void): void {
  listeners.add(fn);
}

/** Try each choice in turn until one opens. */
async function open(choices: readonly CameraChoice[]): Promise<boolean> {
  if (!video || !navigator.mediaDevices?.getUserMedia) return false;
  // Many phones cannot run two cameras at once, so the old one closes first.
  close();
  for (const choice of choices) {
    try {
      const next = await navigator.mediaDevices.getUserMedia({ video: constraints(choice), audio: false });
      stream = next;
      const settings = next.getVideoTracks()[0]?.getSettings() ?? {};
      current = { deviceId: settings.deviceId ?? null, facing: settings.facingMode ?? facingOf(choice) };
      const mirror = mirrored(current.facing);
      video.dataset.mirror = String(mirror);
      video.style.transform = mirror ? "" : "none";
      video.srcObject = next;
      await video.play();
      // Turned off while the camera was opening: close it again.
      if (!on) {
        close();
        video.srcObject = null;
        return false;
      }
      if (choice !== DEFAULT) writePreferred(choice);
      notify();
      return true;
    } catch {
      // Not there, busy or refused: try the next.
    }
  }
  return false;
}

function close(): void {
  for (const track of stream?.getTracks() ?? []) track.stop();
  stream = null;
}

function notify(): void {
  for (const fn of listeners) fn();
}

function constraints(choice: CameraChoice): MediaTrackConstraints {
  const size = { width: { ideal: 1280 }, height: { ideal: 720 } };
  if ("deviceId" in choice) return { deviceId: { exact: choice.deviceId }, ...size };
  // The default asks for the selfie camera but takes whatever there is.
  return choice === DEFAULT ? { facingMode: "user", ...size } : { facingMode: { exact: choice.facing }, ...size };
}

/** Some browsers leave facingMode out of a track's settings; the request said it. */
function facingOf(choice: CameraChoice): string | null {
  return "facing" in choice && choice !== DEFAULT ? choice.facing : null;
}

function readPreferred(): CameraChoice | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (raw && typeof raw === "object") {
      const r = raw as Record<string, unknown>;
      if (r.facing === "user" || r.facing === "environment") return { facing: r.facing };
      if (typeof r.deviceId === "string" && r.deviceId) return { deviceId: r.deviceId };
    }
  } catch {
    // Blocked or garbled: start from the default.
  }
  return null;
}

function writePreferred(choice: CameraChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

function readOn(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) !== "1";
  } catch {
    return true;
  }
}

function writeOn(value: boolean): void {
  try {
    if (value) localStorage.removeItem(OFF_KEY);
    else localStorage.setItem(OFF_KEY, "1");
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}
