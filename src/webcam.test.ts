import { describe, expect, it } from "vitest";
import { mirrored, nextCameras } from "./webcam.ts";

describe("nextCameras", () => {
  const ids = ["front", "back", "usb"];

  it("flips a phone's selfie camera to the back, then tries the next device", () => {
    expect(nextCameras({ deviceId: "front", facing: "user" }, ids)).toEqual([
      { facing: "environment" },
      { deviceId: "back" },
    ]);
  });

  it("flips the back camera to the selfie one", () => {
    expect(nextCameras({ deviceId: "back", facing: "environment" }, ids)[0]).toEqual({ facing: "user" });
  });

  it("walks the devices in turn when a camera does not say which way it faces", () => {
    expect(nextCameras({ deviceId: "usb", facing: null }, ids)).toEqual([{ deviceId: "front" }]);
    expect(nextCameras({ deviceId: null, facing: null }, ids)).toEqual([{ deviceId: "front" }]);
  });

  it("has nothing to offer a lone camera that does not face either way", () => {
    expect(nextCameras({ deviceId: "front", facing: null }, ["front"])).toEqual([]);
  });
});

describe("mirrored", () => {
  it("mirrors a camera facing the user, and one that does not say", () => {
    expect(mirrored("user")).toBe(true);
    expect(mirrored(null)).toBe(true);
    expect(mirrored("environment")).toBe(false);
  });
});
