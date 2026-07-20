// Starts the webcam and pipes it into the background <video>. If the camera is
// unavailable or denied we just fall back to the dark background — the lesson
// still works, it simply loses the "manipulate math over your own image" feel.

export async function startWebcam(video: HTMLVideoElement): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
    return true;
  } catch {
    return false;
  }
}
