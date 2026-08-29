import type { Prepared } from "../types";
import { drawBannerFrame } from "./menu";
import { newPrintState, printMessage } from "./print";
import { clearScreen, type ScreenBuffers } from "./screen";

export type EndPhase = "cores" | "stats";

/** `$693F` then `$6730`. Hi-score `$64FA` is not written. */
export interface EndUi {
  kind: "end";
  phase: EndPhase;
  scoreDigits: number[];
  adventure: number;
  timeMinutes: number;
  timeSeconds: number;
  coresReplaced: number;
}

export function beginEndUi(
  victory: boolean,
  fields: {
    scoreDigits: number[];
    adventure: number;
    timeMinutes: number;
    timeSeconds: number;
    coresReplaced: number;
  },
): EndUi {
  return {
    kind: "end",
    phase: victory ? "cores" : "stats",
    scoreDigits: fields.scoreDigits.slice(),
    adventure: fields.adventure,
    timeMinutes: fields.timeMinutes,
    timeSeconds: fields.timeSeconds,
    coresReplaced: fields.coresReplaced,
  };
}

/** `$693F` waits on `$6600` (skipped); any key advances to `$6730`. */
export function feedEndKey(ui: EndUi, key: string): void {
  if (ui.phase !== "cores") return;
  if (key === "Shift" || key === "Control" || key === "Alt" || key === "AltGraph") return;
  ui.phase = "stats";
}

function printBytes(buf: ScreenBuffers, bytes: number[]): void {
  printMessage(buf, newPrintState(), bytes);
}

/** `$693F` DEFM — keep ROM typo THTUPID. */
const CORES_COMPLETE: number[] = [
  0x16, 0x03, 0x07, 0x10, 0x05,
  ..."THE CORES COMPLETE".split("").map((c) => c.charCodeAt(0)),
  0x16, 0x05, 0x06,
  ..."BUT HOW ARE YOU GONNA".split("").map((c) => c.charCodeAt(0)),
  0x16, 0x07, 0x06,
  ..."GET HOME WHEN ONLY A".split("").map((c) => c.charCodeAt(0)),
  0x16, 0x09, 0x03,
  ..."THTUPID LOONY WOULD WANDER".split("").map((c) => c.charCodeAt(0)),
  0x16, 0x0b, 0x03,
  ..."THIS FAR OUT IN THE GALAXY".split("").map((c) => c.charCodeAt(0)),
  0xff,
];

/** `$6738` / `$6779` labels. */
const GAME_OVER_LABELS: number[] = [
  0x16, 0x03, 0x0b, 0x10, 0x07,
  ..."GAME  OVER".split("").map((c) => c.charCodeAt(0)),
  0x16, 0x06, 0x0a, 0x10, 0x05,
  ..."SCORE".split("").map((c) => c.charCodeAt(0)),
  0x16, 0x09, 0x07, 0x10, 0x03,
  ..."ADVENTURE SCORE".split("").map((c) => c.charCodeAt(0)),
  0x16, 0x0c, 0x08, 0x10, 0x04,
  ..."TIME TAKEN".split("").map((c) => c.charCodeAt(0)),
  0x16, 0x0f, 0x05, 0x10, 0x07,
  ..."CORE ELEMENTS".split("").map((c) => c.charCodeAt(0)),
  0x16, 0x11, 0x07,
  ..."REPLACED".split("").map((c) => c.charCodeAt(0)),
  0xff,
];

function atString(row: number, col: number, ink: number, text: string): number[] {
  return [0x16, row, col, 0x10, ink, 0x13, 1, ...[...text].map((c) => c.charCodeAt(0)), 0xff];
}

export function drawEndOverlay(buf: ScreenBuffers, ui: EndUi, prep?: Prepared): void {
  clearScreen(buf, 0x02);
  drawBannerFrame(buf, prep);
  if (ui.phase === "cores") {
    printBytes(buf, CORES_COMPLETE);
    return;
  }
  printBytes(buf, GAME_OVER_LABELS);
  const score = ui.scoreDigits.map((d) => String(d & 0xf)).join("");
  printBytes(buf, atString(6, 16, 5, score));
  printBytes(buf, atString(9, 23, 3, `${ui.adventure & 0xff}/`));
  const mm = String(ui.timeMinutes).padStart(2, "0");
  const ss = String(ui.timeSeconds).padStart(2, "0");
  printBytes(buf, atString(12, 20, 4, `${mm}.${ss}`));
  const cores = Math.max(0, ui.coresReplaced | 0);
  printBytes(buf, atString(19, 10, 7, cores < 10 ? `0${cores}` : String(cores)));
}
