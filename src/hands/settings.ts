// Gesture settings: what the user can configure about hand input, the
// defaults, and a small persisted store. Pure apart from the injected Storage,
// so the rules (one pose per job, clamped ranges) are testable without a DOM.

/** A static hand shape the classifier can recognise (pose.ts). */
export type Pose = "fist" | "open" | "victory" | "thumbsUp" | "point";

/** What "pressing the mouse button" looks like for a hand. */
export type GrabGesture = "pinch" | "fist";

/** Things a held pose can trigger. Pages decide what each one means. */
export type Action = "next" | "previous" | "reset" | "notes";

export const ACTIONS: readonly Action[] = ["next", "previous", "reset", "notes"];
export const POSES: readonly Pose[] = ["thumbsUp", "victory", "open", "point", "fist"];

export interface GestureSettings {
  /** Master switch. Off means the camera is only a backdrop. */
  enabled: boolean;
  /** Which of the user's hands may drive the cursor. */
  hands: "both" | "left" | "right";
  grab: GrabGesture;
  /** 0–1. Higher engages a pinch with the fingers further apart. */
  pinchSensitivity: number;
  /** 0–1. Higher is steadier but trails the hand more. */
  smoothing: number;
  /** How long a pose must be held before its action fires. */
  holdMs: number;
  /** Pose bound to each action, or null for "no gesture". */
  bindings: Record<Action, Pose | null>;
  /** Draw the tracked hand skeleton over the video. */
  showSkeleton: boolean;
}

export const DEFAULT_SETTINGS: GestureSettings = {
  enabled: true,
  hands: "both",
  grab: "pinch",
  pinchSensitivity: 0.5,
  smoothing: 0.5,
  holdMs: 700,
  bindings: { next: "thumbsUp", previous: "victory", reset: null, notes: null },
  showSkeleton: false,
};

export const HOLD_MS_RANGE = { min: 300, max: 2000, step: 100 } as const;

const clamp01 = (v: unknown, fallback: number): number =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/**
 * Coerce anything (stale localStorage, a partial update) into valid settings.
 * Enforces the one rule that keeps gestures unambiguous: a pose does at most
 * one job. The grab gesture wins over an action, and earlier actions win over
 * later ones.
 */
export function sanitize(raw: unknown): GestureSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<GestureSettings>;
  const d = DEFAULT_SETTINGS;
  const grab: GrabGesture = r.grab === "fist" ? "fist" : "pinch";
  const hands = r.hands === "left" || r.hands === "right" ? r.hands : "both";
  const holdRaw = typeof r.holdMs === "number" && Number.isFinite(r.holdMs) ? r.holdMs : d.holdMs;
  const holdMs = Math.min(HOLD_MS_RANGE.max, Math.max(HOLD_MS_RANGE.min, Math.round(holdRaw)));

  const taken = new Set<Pose>();
  if (grab === "fist") taken.add("fist");
  const rawBindings = (r.bindings && typeof r.bindings === "object" ? r.bindings : d.bindings) as
    Partial<Record<Action, unknown>>;
  const bindings = {} as Record<Action, Pose | null>;
  for (const action of ACTIONS) {
    const want = action in rawBindings ? rawBindings[action] : d.bindings[action];
    const pose = POSES.includes(want as Pose) ? (want as Pose) : null;
    bindings[action] = pose && !taken.has(pose) ? pose : null;
    if (bindings[action]) taken.add(bindings[action]);
  }

  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : d.enabled,
    hands,
    grab,
    pinchSensitivity: clamp01(r.pinchSensitivity, d.pinchSensitivity),
    smoothing: clamp01(r.smoothing, d.smoothing),
    holdMs,
    bindings,
    showSkeleton: typeof r.showSkeleton === "boolean" ? r.showSkeleton : d.showSkeleton,
  };
}

/** Bind `pose` to `action`, taking it away from whatever held it before. */
export function bind(s: GestureSettings, action: Action, pose: Pose | null): GestureSettings {
  const bindings = { ...s.bindings };
  if (pose) for (const a of ACTIONS) if (bindings[a] === pose) bindings[a] = null;
  bindings[action] = pose;
  // A fist cannot both grab and trigger; choosing it for an action moves the
  // grab back to pinch rather than silently dropping the new binding.
  const grab = pose === "fist" ? "pinch" : s.grab;
  return sanitize({ ...s, grab, bindings });
}

/** Choose the grab gesture, unbinding any action that used the same pose. */
export function setGrab(s: GestureSettings, grab: GrabGesture): GestureSettings {
  return sanitize({ ...s, grab });
}

const STORAGE_KEY = "triangle-lab:gestures";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** Observable settings, persisted so every lesson page shares one setup. */
export class SettingsStore {
  private value: GestureSettings;
  private readonly listeners = new Set<(s: GestureSettings) => void>();

  constructor(private readonly storage: StorageLike | null = defaultStorage()) {
    this.value = sanitize(this.read());
  }

  get(): GestureSettings {
    return this.value;
  }

  set(next: GestureSettings): void {
    this.value = sanitize(next);
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.value));
    } catch {
      // Private windows and full quotas refuse writes; the session still works.
    }
    for (const fn of this.listeners) fn(this.value);
  }

  subscribe(fn: (s: GestureSettings) => void): void {
    this.listeners.add(fn);
  }

  private read(): unknown {
    try {
      const text = this.storage?.getItem(STORAGE_KEY);
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  }
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
