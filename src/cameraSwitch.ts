// The pill in the top bar that switches camera (webcam.ts): on a phone, from
// the selfie camera to the one on the back and again; with other cameras
// attached, to each in turn. It shows only once the page can see a second
// camera, which most browsers reveal only after the first has been allowed,
// and not while the camera is turned off.

import { camera, cameraIds, onCameraChange, switchCamera } from "./webcam.ts";

const ICON = `<svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
  <path d="M1.8 5.2h2.6l1.2-1.8h4.8l1.2 1.8h2.6v7.6H1.8z" />
  <path d="M5.5 9.3a2.6 2.6 0 0 1 4.4-1.7M10.5 8.7a2.6 2.6 0 0 1-4.4 1.7" />
  <path d="M10.2 6.2v1.6H8.6M5.8 11.8v-1.6h1.6" />
</svg>`;

/** Add the pill to the top bar, before the lesson's heading. */
export function mountCameraSwitch(topbar: HTMLElement): void {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nav-pill nav-camera";
  button.title = "Switch camera";
  button.setAttribute("aria-label", "Switch camera");
  button.innerHTML = ICON;
  button.hidden = true;
  button.addEventListener("click", async () => {
    button.disabled = true;
    await switchCamera();
    button.disabled = false;
  });
  topbar.insertBefore(button, topbar.querySelector("#heading"));

  const refresh = async (): Promise<void> => {
    button.hidden = !camera.on() || (await cameraIds()).length < 2;
  };
  onCameraChange(() => void refresh());
  navigator.mediaDevices?.addEventListener?.("devicechange", () => void refresh());
  void refresh();
}
