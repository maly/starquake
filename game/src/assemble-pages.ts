import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "./server";

export const PAGE_JSON = [
  "rooms.json",
  "graphics.json",
  "blocks.json",
  "sprites.json",
  "items.json",
  "actors.json",
  "block_attrs.json",
] as const;

const PAGE_ASSETS = ["index.html", "style.css", "bundle.js", "bgm.mp3", "intro.mp3"] as const;

/** Copy viewer + extract JSON into `docs/` for GitHub Pages. */
export function assemblePages(root: string, dest = path.join(root, "docs")): void {
  mkdirSync(dest, { recursive: true });
  mkdirSync(path.join(dest, "out"), { recursive: true });
  writeFileSync(path.join(dest, ".nojekyll"), "");
  for (const name of PAGE_ASSETS) {
    const src = path.join(root, "viewer", name);
    if (!existsSync(src)) throw new Error("missing " + src);
    copyFileSync(src, path.join(dest, name));
  }
  for (const name of PAGE_JSON) {
    const src = path.join(root, "out", name);
    if (!existsSync(src)) throw new Error("missing " + src + " (run extract)");
    copyFileSync(src, path.join(dest, "out", name));
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return /[/\\]assemble-pages\.(ts|js)$/.test(path.normalize(entry));
}

if (isDirectRun()) {
  assemblePages(REPO_ROOT);
  process.stdout.write("assembled " + path.join(REPO_ROOT, "docs") + "\n");
}
