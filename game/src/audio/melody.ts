/**
 * Melodies `$6600` / `$D9DE` — not in the playable engine.
 *
 * Five call sites (`$5ED3`, `$65B5`, `$6727`, `$685F`, `$69D0`) are title /
 * menu / intro / hi-score / end-screen. `$D9DE` is blocking `DI` busy-wait
 * and must not run inside the 50 Hz tick. In-game background is MP3 only.
 *
 * Identifiers are 1-based (`B` before `CALL $6600`). Pointer table `$65F6`.
 */
export const MELODY_GAME_OVER = 1;
export const MELODY_HI_SCORE = 2;
export const MELODY_MENU = 3;
export const MELODY_INTRO = 4;
export const MELODY_VICTORY = 5;
