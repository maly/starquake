import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { beginMenuUi } from "../ui/menu";
import { idleUi } from "../ui/overlay";
import { BGM_INTRO_URL, BGM_LOOP_URL, musicUrlFor } from "./tracks";

describe("MP3 tracks (menu intro vs in-game loop)", () => {
  it("viewer/intro.mp3 on $5E81 title/menu/intro; viewer/bgm.mp3 in play", () => {
    assert.equal(BGM_INTRO_URL, "intro.mp3");
    assert.equal(BGM_LOOP_URL, "bgm.mp3");
    const menu = beginMenuUi();
    assert.equal(musicUrlFor(menu), BGM_INTRO_URL);
    menu.phase = "intro";
    assert.equal(musicUrlFor(menu), BGM_INTRO_URL);
    menu.phase = "quit";
    assert.equal(musicUrlFor(menu), BGM_INTRO_URL);
    menu.phase = "goodbye";
    assert.equal(musicUrlFor(menu), BGM_INTRO_URL);
    assert.equal(musicUrlFor(idleUi()), BGM_LOOP_URL);
    assert.equal(musicUrlFor({ kind: "door" }), BGM_LOOP_URL);
    assert.equal(musicUrlFor({ kind: "teleport" }), BGM_LOOP_URL);
    assert.equal(musicUrlFor({ kind: "cheops" }), BGM_LOOP_URL);
  });
});
