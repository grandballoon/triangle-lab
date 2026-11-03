// The pose panel's sliders, as data: what each reads from a pose, what it
// writes back, and how its value is shown. Pure, so the panel (panel.ts) is
// only inputs bound to these.

import { LIMITS, type Pose } from "./pose.ts";

export interface Dial {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  read(pose: Pose): number;
  write(pose: Pose, value: number): Pose;
  format(value: number): string;
}

const DEG = Math.PI / 180;
const degrees = (v: number): string => `${Math.round(v)}°`.replace("-", "−");

const angle = (key: "tilt" | "turn" | "spin", label: string, limit: number): Dial => ({
  key,
  label,
  min: -limit,
  max: limit,
  step: 1,
  read: (pose) => pose[key] / DEG,
  write: (pose, v) => ({ ...pose, [key]: v * DEG }),
  format: degrees,
});

export const dials: readonly Dial[] = [
  angle("tilt", "Tilt", LIMITS.lean / DEG),
  angle("turn", "Turn", LIMITS.lean / DEG),
  angle("spin", "Spin", 180),
  {
    key: "size",
    label: "Size",
    // Doubling is as far along the slider as halving, wherever it starts.
    min: Math.log2(LIMITS.scale.min),
    max: Math.log2(LIMITS.scale.max),
    step: 0.01,
    read: (pose) => Math.log2(pose.scale),
    write: (pose, v) => ({ ...pose, scale: 2 ** v }),
    format: (v) => `${Math.round(100 * 2 ** v)}%`,
  },
  {
    key: "fov",
    label: "Lens",
    min: LIMITS.fov.min / DEG,
    max: LIMITS.fov.max / DEG,
    step: 1,
    read: (pose) => pose.fov / DEG,
    write: (pose, v) => ({ ...pose, fov: v * DEG }),
    format: degrees,
  },
];
