import {
  CELL,
  MENU_BAR_H,
  MENU_BAR_V,
  MENU_CONTROL_DEFAULT,
  MENU_CORNERS,
  INTRO_LINE2,
  INTRO_LINE3,
  INTRO_LINE4,
  INTRO_LINE5,
  INTRO_LINE6,
  INTRO_LINE7,
  INTRO_TITLE,
  MENU_FOOT_COL_L,
  MENU_FOOT_COL_R,
  MENU_FOOT_L,
  MENU_FOOT_R,
  MENU_FOOT_ROW,
  MENU_GOODBYE,
  MENU_INK_IDLE,
  MENU_INK_SELECTED,
  MENU_INK_STATIC,
  MENU_KEYS_4,
  MENU_KEYS_5,
  MENU_OLLY_COL,
  MENU_OLLY_ROW,
  MENU_OLLY_UDG,
  MENU_QUIT_HINT,
  MENU_QUIT_MSG,
  MENU_QUIT_YN,
  MENU_SFX_SELECT,
  MENU_TITLE,
  MENU_TITLE_COL,
  MENU_TITLE_ROW,
  MENU_TITLE_UDG90,
} from "../constants";
import { requestSfx } from "../audio/effects";
import type { Prepared, World } from "../types";
import { newPrintState, printMessage } from "./print";
import { SCREEN_COLS, cellIndex, clearScreen, type ScreenBuffers } from "./screen";

export type MenuPhase = "options" | "intro" | "quit" | "goodbye";

export interface MenuUi {
  kind: "menu";
  phase: MenuPhase;
  /** `$5E58` 1–5. */
  control: number;
}

export function beginMenuUi(): MenuUi {
  return { kind: "menu", phase: "options", control: MENU_CONTROL_DEFAULT };
}

function printAt(buf: ScreenBuffers, row: number, col: number, text: string, ink: number, bright = 1): void {
  const bytes = [0x16, row, col, 0x13, bright, 0x10, ink, 0x11, 0, ...[...text].map((c) => c.charCodeAt(0)), 0xff];
  printMessage(buf, newPrintState(), bytes);
}

function blitGraphic(buf: ScreenBuffers, prep: Prepared | undefined, id: number, row: number, col: number): void {
  const graphic = prep?.graphics[id];
  if (!graphic) return;
  for (const cell of graphic.cells) {
    const cy = row + cell.row;
    const cx = col + cell.col;
    if (cy < 0 || cy >= 24 || cx < 0 || cx >= SCREEN_COLS) continue;
    const idx = cellIndex(cy, cx);
    const dst = idx * CELL;
    for (let py = 0; py < CELL; py++) buf.data[dst + py] = cell.data[py]!;
    if (cell.attr != null) buf.attr[idx] = cell.attr & 0xff;
  }
}

function plotUdg(buf: ScreenBuffers, row: number, col: number, data: readonly number[], attr: number): void {
  if (row < 0 || row >= 24 || col < 0 || col >= SCREEN_COLS) return;
  const idx = cellIndex(row, col);
  const dst = idx * CELL;
  for (let py = 0; py < 8; py++) buf.data[dst + py] = data[py]!;
  buf.attr[idx] = attr & 0xff;
}

/** `$6615` A=`$05`: edge bars `$8A`/`$8B` + corners `$8C`–`$8F`. */
function drawBanners(buf: ScreenBuffers, prep: Prepared | undefined): void {
  for (let i = 0; i < 7; i++) {
    const col = 2 + i * 4;
    blitGraphic(buf, prep, MENU_BAR_H, 0, col);
    blitGraphic(buf, prep, MENU_BAR_H, MENU_FOOT_ROW, col);
  }
  for (let i = 0; i < 5; i++) {
    const row = 2 + i * 4;
    blitGraphic(buf, prep, MENU_BAR_V, row, 0);
    blitGraphic(buf, prep, MENU_BAR_V, row, 0x1e);
  }
  for (const [col, row, id] of MENU_CORNERS) blitGraphic(buf, prep, id, row, col);
}

function drawTitle(buf: ScreenBuffers): void {
  const attr = 0x47;
  let col = MENU_TITLE_COL;
  for (let i = 0; i < MENU_TITLE.length; i++) {
    printAt(buf, MENU_TITLE_ROW, col, MENU_TITLE[i]!, 7);
    col += 1;
    if (i + 1 < MENU_TITLE.length) {
      plotUdg(buf, MENU_TITLE_ROW, col, MENU_TITLE_UDG90, attr);
      col += 1;
    }
  }
}

function optionInk(ui: MenuUi, n: number): number {
  return ui.control === n ? MENU_INK_SELECTED : MENU_INK_IDLE;
}

function drawOptions(buf: ScreenBuffers, ui: MenuUi): void {
  printAt(buf, 6, 4, "1.KEMPSTON JOYSTICK", optionInk(ui, 1));
  printAt(buf, 8, 4, "2.CURSOR JOYSTICK", optionInk(ui, 2));
  printAt(buf, 10, 4, "3.SINCLAIR ZX2 JOYSTICK", optionInk(ui, 3));
  printAt(buf, 12, 4, "4.KEYBOARD ... " + MENU_KEYS_4, optionInk(ui, 4));
  printAt(buf, 14, 4, "5.UDK KEYBOARD ... " + MENU_KEYS_5, optionInk(ui, 5));
  printAt(buf, 16, 4, "6.DEFINE YOUR OWN KEYS", MENU_INK_STATIC);
  printAt(buf, 18, 4, "0.START GAME", MENU_INK_STATIC);
  printAt(buf, 20, 4, "Q.QUIT", MENU_INK_STATIC);
}

function drawQuit(buf: ScreenBuffers): void {
  printAt(buf, 4, 9, MENU_QUIT_MSG, 6);
  printAt(buf, 6, 9, MENU_QUIT_HINT, 6);
  printAt(buf, 9, 12, MENU_QUIT_YN, 6);
}

/** `$6615` edge bars + corners. A is the `$EA63` mask; graphics come from `prep`. */
export function drawBannerFrame(buf: ScreenBuffers, prep?: Prepared): void {
  drawBanners(buf, prep);
}

export function drawMenuOverlay(buf: ScreenBuffers, ui: MenuUi, prep?: Prepared): void {
  clearScreen(buf, 0x07);
  drawBannerFrame(buf, prep);
  if (ui.phase === "options") {
    blitGraphic(buf, prep, MENU_FOOT_L, MENU_FOOT_ROW, MENU_FOOT_COL_L);
    blitGraphic(buf, prep, MENU_FOOT_R, MENU_FOOT_ROW, MENU_FOOT_COL_R);
    drawTitle(buf);
    drawOptions(buf, ui);
    return;
  }
  if (ui.phase === "intro") {
    printAt(buf, 4, 5, INTRO_TITLE, 5);
    printAt(buf, 7, 3, INTRO_LINE2, 3);
    printAt(buf, 9, 5, INTRO_LINE3, 3);
    printAt(buf, 11, 4, INTRO_LINE4, 3);
    printAt(buf, 13, 10, INTRO_LINE5, 3);
    printAt(buf, 15, 5, INTRO_LINE6, 3);
    printAt(buf, 17, 7, INTRO_LINE7, 3);
    return;
  }
  drawQuit(buf);
  if (ui.phase === "goodbye") {
    printAt(buf, 19, 6, MENU_GOODBYE, 2);
    blitGraphic(buf, prep, MENU_OLLY_UDG, MENU_OLLY_ROW, MENU_OLLY_COL);
  }
}

export type MenuAction = "start" | "stay";

/**
 * `$D5C8` digits as ASCII `$30`–`$36`. Czech QWERTZ sends `+ěščřžý` on the
 * number row — use `ev.code` Digit0–6 / Numpad0–6 (same as Cheops 1–5).
 */
export function menuDigitFromKey(key: string, physical?: string): number | null {
  if (physical) {
    const digit = physical.match(/^(?:Digit|Numpad)([0-6])$/);
    if (digit) return (digit[1]!.charCodeAt(0) - 0x30) & 0xff;
  }
  if (key.length === 1 && key >= "0" && key <= "6") return key.charCodeAt(0) - 0x30;
  return null;
}

/** `$5FF4` / `$666D` / `$6060`. Define-keys `$6194` is a no-op. `$6600` skipped. */
export function feedMenuKey(ui: MenuUi, key: string, world?: World, physical?: string): MenuAction {
  if (ui.phase === "goodbye") return "stay";
  if (ui.phase === "intro") {
    if (key === "Shift" || key === "Control" || key === "Alt" || key === "AltGraph") return "stay";
    return "start";
  }
  if (ui.phase === "quit") {
    const ch = key.length === 1 ? key.toUpperCase() : "";
    if (ch === "Y") ui.phase = "goodbye";
    else if (ch === "N") ui.phase = "options";
    return "stay";
  }
  const digit = menuDigitFromKey(key, physical);
  if (digit === 0) {
    ui.phase = "intro";
    return "stay";
  }
  if (digit !== null && digit >= 1 && digit <= 5) {
    if (digit !== ui.control) {
      ui.control = digit;
      if (world) requestSfx(world, MENU_SFX_SELECT);
    }
    return "stay";
  }
  if (key === "q" || key === "Q") {
    ui.phase = "quit";
    return "stay";
  }
  return "stay";
}
