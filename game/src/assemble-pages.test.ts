import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { PAGE_JSON, assemblePages } from "./assemble-pages";
import { REPO_ROOT } from "./server";

describe("assemble GitHub Pages site into docs/", () => {
  it("copies viewer assets and out/*.json next to index.html", () => {
    const rooms = path.join(REPO_ROOT, "out", "rooms.json");
    if (!existsSync(rooms)) return;
    const dest = mkdtempSync(path.join(tmpdir(), "sq-pages-"));
    try {
      assemblePages(REPO_ROOT, dest);
      assert.equal(existsSync(path.join(dest, "index.html")), true);
      assert.equal(existsSync(path.join(dest, "bundle.js")), true);
      assert.equal(existsSync(path.join(dest, ".nojekyll")), true);
      for (const name of PAGE_JSON) {
        assert.equal(existsSync(path.join(dest, "out", name)), true, name);
      }
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});
