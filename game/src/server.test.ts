import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { REPO_ROOT, serve } from "./server";

describe("static server", () => {
  it("serves the viewer and export JSON", async () => {
    const rooms = path.join(REPO_ROOT, "out", "rooms.json");
    if (!existsSync(rooms)) {
      return;
    }
    const { server, url, port } = await serve(0);
    try {
      assert.ok(port > 0);

      const page = await fetch(url);
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /bundle\.js/);
      assert.match(html, /canvas/i);

      const css = await fetch(new URL("style.css", url));
      assert.equal(css.status, 200);

      const js = await fetch(new URL("bundle.js", url));
      assert.equal(js.status, 200);

      const intro = await fetch(new URL("intro.mp3", url), { method: "HEAD" });
      assert.equal(intro.status, 200);
      assert.equal((intro.headers.get("content-type") ?? "").includes("mpeg"), true);
      const bgm = await fetch(new URL("bgm.mp3", url), { method: "HEAD" });
      assert.equal(bgm.status, 200);

      const data = await fetch(`http://127.0.0.1:${port}/out/rooms.json`);
      assert.equal(data.status, 200);
      assert.equal((data.headers.get("content-type") ?? "").includes("json"), true);
      const json = (await data.json()) as { rooms: unknown[] };
      assert.equal(json.rooms.length, 512);

      const traversal = await fetch(`http://127.0.0.1:${port}/out/../game/package.json`);
      assert.equal(traversal.status, 404);

      const missing = await fetch(`http://127.0.0.1:${port}/viewer/nope.js`);
      assert.equal(missing.status, 404);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
    }
  });
});
