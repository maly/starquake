/** Viewer-relative MP3 URLs. `$6600` is skipped; these replace title vs in-game BGM. */
export const BGM_INTRO_URL = "intro.mp3";
export const BGM_LOOP_URL = "bgm.mp3";

/** Menu `$5E81` / intro `$666D` → intro; play (and overlays) → loop. */
export function musicUrlFor(ui: { kind: string; phase?: string }): string {
  return ui.kind === "menu" ? BGM_INTRO_URL : BGM_LOOP_URL;
}
