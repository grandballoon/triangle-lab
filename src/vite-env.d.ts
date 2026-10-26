/// <reference types="vite/client" />

/** Version of the installed @mediapipe/tasks-vision package (vite.config.ts). */
declare const __MEDIAPIPE_VERSION__: string;

interface ImportMetaEnv {
  /**
   * The recall Worker's address (worker/, src/recall/remote.ts), from
   * .env.development or .env.production. Empty or unset, the deck stays in
   * the browser.
   */
  readonly VITE_RECALL_SYNC_URL?: string;
}
