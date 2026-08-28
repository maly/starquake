import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COLS,
  DEATH_A_ENERGY,
  DEATH_A_OBJ06,
  ENERGY_DRAIN_WRAP,
  ROWS,
  START_ENERGY,
} from "./constants";
import { parseCheatSprite, setInventorySlot } from "./cheat";
import { tickEnergyDrain } from "./entities";
import { applyDeath, createWorld, spawnBlob, tick } from "./physics";
import type { Item, Prepared, Room } from "./types";

function grid(items: Item[] = []): Prepared {
  const solid = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0));
  const attributes = Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0x47));
  const rooms: Room[] = Array.from({ length: 512 }, (_, id) => ({ id, blocks: [], attributes, solid }));
  const itemsByRoom: Item[][] = Array.from({ length: 512 }, () => []);
  for (const it of items) {
    if (it.room >= 0 && it.room < 512) itemsByRoom[it.room]!.push(it);
  }
  return {
    graphics: [],
    sprites: [],
    actorsBySet: new Map(),
    actorsByPtr: new Map(),
    blocks: [],
    rooms,
    itemsByRoom,
  };
}

describe("cheat inventory slot", () => {
  it("parses $0F / 0x10 / decimal and rejects junk", () => {
    assert.equal(parseCheatSprite("$0F"), 0x0f);
    assert.equal(parseCheatSprite("0x10"), 0x10);
    assert.equal(parseCheatSprite("26"), 26);
    assert.equal(parseCheatSprite(" 1A "), 0x1a);
    assert.equal(parseCheatSprite(""), null);
    assert.equal(parseCheatSprite("zz"), null);
  });

  it("writes a sprite into a chosen 0–3 slot and pads earlier empties", () => {
    const world = createWorld(grid(), 1);
    setInventorySlot(world, 2, 0x0f);
    assert.equal(world.inventory[0]?.sprite, 0);
    assert.equal(world.inventory[1]?.sprite, 0);
    assert.equal(world.inventory[2]?.sprite, 0x0f);
    assert.equal(world.inventory[2]?.attr, 3);
    setInventorySlot(world, 0, 0x1a, 5);
    assert.equal(world.inventory[0]?.sprite, 0x1a);
    assert.equal(world.inventory[0]?.attr, 5);
    assert.equal(world.inventory[2]?.sprite, 0x0f);
  });
});

describe("cheatGod", () => {
  it("skips $CB58 energy drain", () => {
    const world = createWorld(grid(), 1);
    world.cheatGod = true;
    world.energyDrain = ENERGY_DRAIN_WRAP - 1;
    tickEnergyDrain(world);
    assert.equal(world.energy, START_ENERGY);
  });

  it("applyDeath is a no-op", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.cheatGod = true;
    applyDeath(prep, blob, world, DEATH_A_OBJ06);
    applyDeath(prep, blob, world, DEATH_A_ENERGY);
    assert.equal(world.deathPhase, null);
  });

  it("energy 0 does not start death during tick", () => {
    const prep = grid();
    const world = createWorld(prep, 1);
    const blob = spawnBlob(prep, 1, world);
    world.cheatGod = true;
    world.energy = 0;
    tick(prep, blob, { left: false, right: false, up: false, down: false, fire: false }, world);
    assert.equal(world.deathPhase, null);
    assert.equal(world.energy, 0);
  });
});
