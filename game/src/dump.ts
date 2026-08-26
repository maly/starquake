import * as fs from "node:fs";
import * as path from "node:path";
import { createWorld, spawnBlob, tick } from "./physics";
import {
  HEIGHT,
  WIDTH,
  clampRoom,
  itemCells,
  moveRoom,
  newBuffers,
  newRgba,
  prepare,
  renderRoom,
  renderWorld,
  roomCol,
  roomRow,
} from "./render";
import type { GameData, Prepared } from "./types";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  return process.argv[i + 1] ?? fallback;
}

function has(name: string): boolean {
  return process.argv.includes(name);
}

function loadData(dir: string): Prepared {
  const read = (name: string) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
  const pack: GameData = {
    rooms: read("rooms.json"),
    graphics: read("graphics.json"),
    blocks: read("blocks.json"),
    sprites: read("sprites.json"),
    items: read("items.json"),
  };
  const actorsPath = path.join(dir, "actors.json");
  if (fs.existsSync(actorsPath)) pack.actors = JSON.parse(fs.readFileSync(actorsPath, "utf8"));
  return prepare(pack);
}

function parseRooms(spec: string, prep: Prepared): number[] {
  if (spec === "sample") {
    const set = new Set([0, 1, 15, 16, 31, 32, 168, 199, 255, 256, 511]);
    prep.itemsByRoom.forEach((list, id) => {
      if (list.length) set.add(id);
    });
    return [...set].sort((a, b) => a - b);
  }
  return spec.split(",").map((s) => parseInt(s, 10));
}

function metaFor(prep: Prepared, roomId: number) {
  const cells: Array<[number, number]> = [];
  for (const it of prep.itemsByRoom[roomId] ?? []) {
    for (const xy of itemCells(it)) cells.push(xy);
  }
  return {
    room: roomId,
    items: prep.itemsByRoom[roomId]?.length ?? 0,
    item_cells: cells,
    solid: prep.rooms[roomId]!.solid,
  };
}

if (has("--nav-test")) {
  const t = [
    moveRoom(0, -1, 0) === 0,
    moveRoom(0, 0, -1) === 0,
    moveRoom(15, 1, 0) === 15,
    moveRoom(15, 0, -1) === 15,
    moveRoom(496, 0, 1) === 496,
    moveRoom(511, 1, 0) === 511,
    moveRoom(511, 0, 1) === 511,
    moveRoom(0, 1, 0) === 1,
    moveRoom(0, 0, 1) === 16,
    moveRoom(15, 0, 1) === 31,
    roomCol(16) === 0 && roomRow(16) === 1,
    clampRoom(-3) === 0 && clampRoom(999) === 511,
  ];
  process.stdout.write(t.every(Boolean) ? "ok\n" : t.join(",") + "\n");
  process.exit(0);
}

const dataDir = arg("--data", "out");
const prep = loadData(dataDir);
const buf = newBuffers();
const rgba = newRgba();

if (has("--timing")) {
  const repeat = parseInt(arg("--repeat", "80"), 10);
  const rooms = parseRooms(arg("--rooms", "0,16,168,255,511"), prep);
  const t0 = process.hrtime.bigint();
  let n = 0;
  for (let i = 0; i < repeat; i++) {
    for (const id of rooms) {
      renderRoom(prep, buf, rgba, id, { items: true, overlay: false });
      n += 1;
    }
  }
  const ns = Number(process.hrtime.bigint() - t0);
  const meanMs = ns / 1e6 / n;

  const liveId = rooms[0] ?? 0;
  const world = createWorld(prep, liveId);
  const blob = spawnBlob(prep, liveId, world);
  const none = { left: false, right: false, up: false, down: false };
  const liveRepeat = Math.max(n, 1);
  const t1 = process.hrtime.bigint();
  for (let i = 0; i < liveRepeat; i++) {
    tick(prep, blob, i % 17 === 0 ? { ...none, down: true } : none, world);
    renderWorld(prep, world, buf, rgba, blob.room, {
      items: true,
      overlay: false,
      blob: { x: blob.x, y: blob.y, set: "blobwr1", frame: 0 },
    });
  }
  const liveNs = Number(process.hrtime.bigint() - t1);
  const liveMeanMs = liveNs / 1e6 / liveRepeat;
  process.stdout.write(
    JSON.stringify({
      frames: n,
      mean_ms: meanMs,
      fps: 1000 / meanMs,
      live_frames: liveRepeat,
      live_mean_ms: liveMeanMs,
      live_fps: 1000 / liveMeanMs,
      rooms,
    }) + "\n",
  );
  process.exit(0);
}

const overlay = has("--overlay");
const items = !has("--no-items");
const outdir = arg("--outdir", "");
const roomList = has("--rooms")
  ? parseRooms(arg("--rooms", "0"), prep)
  : [parseInt(arg("--room", "0"), 10)];

if (outdir) {
  fs.mkdirSync(outdir, { recursive: true });
  const batch = [];
  for (const id of roomList) {
    renderRoom(prep, buf, rgba, id, { items, overlay });
    fs.writeFileSync(path.join(outdir, "room_" + id + ".rgba"), Buffer.from(rgba));
    batch.push(metaFor(prep, id));
  }
  process.stdout.write(JSON.stringify(batch) + "\n");
  process.exit(0);
}

const room = roomList[0]!;
renderRoom(prep, buf, rgba, room, { items, overlay });
if (has("--rgba")) fs.writeFileSync(arg("--rgba", "room.rgba"), Buffer.from(rgba));
if (has("--meta")) process.stdout.write(JSON.stringify(metaFor(prep, room)) + "\n");

void WIDTH;
void HEIGHT;
