import {
  DOOR_MSG_BAD,
  DOOR_MSG_OK,
  TELEPORT_MSG_BAD,
  TELEPORT_MSG_OK,
  TELEPORT_NAME_LEN,
} from "../constants";
import { requestSfx } from "../audio/effects";
import { doorKeysAccepted, evaluateTeleport, expectedDoorCode, teleportNameForRoom } from "../objects";
import type { Prepared, World } from "../types";
import { newPrintState, printMessage } from "./print";
import { clearPlayfield, type ScreenBuffers } from "./screen";

/** Exact ROM overlay copy (double spaces where present). */
export const MSG_SECURITY_DOOR = "SECURITY  DOOR";
export const MSG_ACCESS_CODE = "ACCESS  CODE";
export const MSG_ACCESS_OK = "ACCESS AUTHORISED";
export const MSG_ACCESS_BAD = "ACCESS CODE INVALID";
export const MSG_ENTERED = "YOU HAVE ENTERED";
export const MSG_TELEPORT = "TELEPORT";
export const MSG_CODE_PREFIX = "CODE : ";
export const MSG_ENTER_TP = "ENTER TELEPORTAL";
export const MSG_DEST_CODE = "DESTINATION CODE";
export const MSG_DASHES = "- - - - -";
export const MSG_TP_OK = "NOW TELEPORTING";
export const MSG_TP_BAD = "CODE NOT RECOGNISED";

export type UiKind = "none" | "door" | "teleport";

export interface DoorUi {
  kind: "door";
  phase: "intro" | "result" | "done";
  ok: boolean;
  /** Bit0 of `$DD23` when the door was opened (Right=1 → X+`$30`). */
  openRight: boolean;
  ticks: number;
  digits: number[];
}

export interface TeleportUi {
  kind: "teleport";
  phase: "prompt" | "input" | "result" | "done";
  ownName: string;
  buffer: string;
  /** True while a key is held — wait for release before next char ($CF93). */
  waitingRelease: boolean;
  ok: boolean;
  dest: number;
  ticks: number;
}

export type UiState = { kind: "none" } | DoorUi | TeleportUi;

export function idleUi(): UiState {
  return { kind: "none" };
}

function printAt(buf: ScreenBuffers, row: number, col: number, text: string, ink = 7): void {
  const bytes = [0x16, row, col, 0x10, ink, 0x13, 1, ...[...text].map((c) => c.charCodeAt(0)), 0xff];
  printMessage(buf, newPrintState(), bytes);
}

/** Door overlay intro: titles; result comes from inventory (`$D5FD`), not a typed code. */
export function beginDoorUi(world: World, room: number, openRight: boolean): DoorUi {
  const ok = doorKeysAccepted(world, room);
  requestSfx(world, 0x08);
  return {
    kind: "door",
    phase: "intro",
    ok,
    openRight,
    ticks: 0,
    digits: expectedDoorCode(room),
  };
}

export function beginTeleportUi(room: number, world?: World): TeleportUi {
  if (world) requestSfx(world, 0x07);
  return {
    kind: "teleport",
    phase: "prompt",
    ownName: teleportNameForRoom(room) || "?????",
    buffer: "",
    waitingRelease: true,
    ok: false,
    dest: room,
    ticks: 0,
  };
}

export function drawDoorOverlay(buf: ScreenBuffers, ui: DoorUi): void {
  clearPlayfield(buf);
  printAt(buf, 8, 9, MSG_SECURITY_DOOR);
  printAt(buf, 15, 10, MSG_ACCESS_CODE);
  if (ui.phase === "result" || ui.phase === "done") {
    if (ui.ok) printAt(buf, 21, 7, MSG_ACCESS_OK);
    else printAt(buf, 21, 6, MSG_ACCESS_BAD);
  }
}

export function drawTeleportOverlay(buf: ScreenBuffers, ui: TeleportUi): void {
  clearPlayfield(buf);
  printAt(buf, 8, 4, MSG_ENTERED);
  printAt(buf, 10, 8, MSG_TELEPORT);
  printAt(buf, 12, 6, MSG_CODE_PREFIX + ui.ownName.slice(0, TELEPORT_NAME_LEN));
  printAt(buf, 14, 8, MSG_ENTER_TP);
  printAt(buf, 16, 8, MSG_DEST_CODE);
  if (ui.phase === "prompt" || ui.phase === "input") {
    printAt(buf, 19, 12, MSG_DASHES);
    // echo typed chars as "X " over the dashes
    let col = 12;
    for (let i = 0; i < ui.buffer.length; i++) {
      printAt(buf, 19, col, ui.buffer[i]! + " ");
      col += 2;
    }
  }
  if (ui.phase === "result" || ui.phase === "done") {
    if (ui.ok) printAt(buf, 21, 9, MSG_TP_OK);
    else printAt(buf, 21, 6, MSG_TP_BAD);
  }
}

export function drawUiOverlay(buf: ScreenBuffers, ui: UiState): void {
  if (ui.kind === "door") drawDoorOverlay(buf, ui);
  else if (ui.kind === "teleport") drawTeleportOverlay(buf, ui);
}

/**
 * Advance door UI. Returns true when the caller should apply `applySecurityDoor`
 * and clear the UI.
 */
export function tickDoorUi(ui: DoorUi, world?: World): boolean {
  ui.ticks += 1;
  if (ui.phase === "intro" && ui.ticks >= 25) {
    ui.phase = "result";
    ui.ticks = 0;
    if (world) {
      if (ui.ok) {
        requestSfx(world, 0x0a);
        requestSfx(world, 0x0f);
      } else {
        requestSfx(world, 0x0f);
      }
    }
  } else if (ui.phase === "result" && ui.ticks >= 40) {
    ui.phase = "done";
    return true;
  }
  return ui.phase === "done";
}

/**
 * Map a browser key to the `$D5C8` character set (uppercase ASCII / digit / space).
 * CAPS/ENTER/Sym equivalents return null (ignored like `$01`–`$03`).
 */
export function mapTeleportKey(key: string): string | null {
  if (key === " ") return " ";
  if (key.length === 1) {
    const ch = key.toUpperCase();
    const code = ch.charCodeAt(0);
    if (code >= 0x30 && code <= 0x39) return ch;
    if (code >= 0x41 && code <= 0x5a) return ch;
  }
  return null;
}

/**
 * Feed a key event into the teleport input FSM (`$CF8E`…`$CFB1`).
 * `down` false = keyup (release). Only the first 5 accepted chars matter.
 */
export function feedTeleportKey(ui: TeleportUi, key: string, down: boolean, world?: World): void {
  if (ui.phase !== "input" && ui.phase !== "prompt") return;
  if (ui.phase === "prompt") ui.phase = "input";
  if (!down) {
    ui.waitingRelease = false;
    return;
  }
  if (ui.waitingRelease) return;
  if (ui.buffer.length >= TELEPORT_NAME_LEN) return;
  const ch = mapTeleportKey(key);
  if (!ch) return;
  // `$CF9A` drops A < $0A (control); letters/digits/space pass
  ui.buffer += ch;
  ui.waitingRelease = true;
  if (world) requestSfx(world, 0x11);
}

/** After 5 chars, evaluate against `$D036`. */
export function finishTeleportInput(ui: TeleportUi, room: number, world?: World): void {
  const ev = evaluateTeleport(ui.buffer, room);
  ui.ok = ev.ok;
  ui.dest = ev.dest;
  ui.phase = "result";
  ui.ticks = 0;
  if (world) {
    if (ui.ok) {
      requestSfx(world, 0x10);
      requestSfx(world, 0x09);
    } else {
      requestSfx(world, 0x0f);
    }
  }
}

export function tickTeleportUi(ui: TeleportUi, room: number, world?: World): boolean {
  if (ui.phase === "prompt") {
    ui.phase = "input";
    ui.waitingRelease = true;
  }
  if (ui.phase === "input" && ui.buffer.length >= TELEPORT_NAME_LEN) {
    finishTeleportInput(ui, room, world);
  }
  if (ui.phase === "result") {
    ui.ticks += 1;
    if (ui.ticks >= 40) {
      ui.phase = "done";
      return true;
    }
  }
  return ui.phase === "done";
}

/** Sync legacy `world.message` strings used by the dev panel / dumps. */
export function syncWorldMessage(world: World, ui: UiState): void {
  if (ui.kind === "door") {
    world.message = ui.ok ? DOOR_MSG_OK : DOOR_MSG_BAD;
  } else if (ui.kind === "teleport" && (ui.phase === "result" || ui.phase === "done")) {
    world.message = ui.ok ? TELEPORT_MSG_OK : TELEPORT_MSG_BAD;
  }
}

export function isUiBlocking(ui: UiState): boolean {
  return ui.kind !== "none";
}

/** Test helper: push five characters without release gating. */
export function typeTeleportCode(ui: TeleportUi, code: string, world?: World): void {
  ui.phase = "input";
  ui.waitingRelease = false;
  for (const ch of code.slice(0, TELEPORT_NAME_LEN)) {
    feedTeleportKey(ui, ch, true, world);
    feedTeleportKey(ui, ch, false, world);
  }
}
