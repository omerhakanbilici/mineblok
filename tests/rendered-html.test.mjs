import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the full-screen block world HUD", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Mineblok \| Minik Kaşifler İçin Oyun<\/title>/i);
  assert.match(html, /class="game-shell"/);
  assert.match(html, /class="world-canvas mode-walk"/);
  assert.match(html, /<h1>Mineblok<\/h1>/);
  assert.match(html, /Uçsuz bucaksız Mineblok dünyası seni bekliyor!/);
  assert.doesNotMatch(html, /class="hint-bubble"/);
  assert.match(html, /class="world-card"[\s\S]*class="tool-dock [^"]*"[\s\S]*<\/section>/);
  assert.match(html, />GEZ<\/strong>/);
  assert.match(html, />YAP<\/strong>/);
  assert.match(html, />GERİ AL<\/strong>/);
});

test("keeps camera, wandering animals, and every control inside the game scene", async () => {
  const [game, css, page, layout] = await Promise.all([
    readFile(new URL("../app/BlockGardenWorld.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/world.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(game, /const WORLD_SIZE = 100;/);
  assert.match(game, /cameraRef\.current = playerWorld;/);
  assert.match(game, /drawVoxelPlayer/);
  assert.match(game, /const surfaceY = center\.y \+ metrics\.tileH \* 0\.03;/);
  assert.match(game, /const shoeHeight = 7 \* unit;/);
  assert.match(game, /function updateAnimal/);
  assert.match(game, /duration: 1150 \+ Math\.random\(\) \* 450/);
  assert.match(game, /<section className="world-card"[\s\S]*<header className="scene-topbar"/);
  assert.match(game, /<nav className=\{`tool-dock/);
  assert.match(game, /className="dpad"/);

  assert.match(css, /\.game-shell,[\s\S]*\.world-card[\s\S]*position:\s*fixed;[\s\S]*inset:\s*0;/);
  assert.match(css, /\.world-canvas[\s\S]*width:\s*100%;[\s\S]*height:\s*100%;/);
  assert.match(css, /\.tool-dock[\s\S]*position:\s*absolute;/);
  assert.match(page, /import BlockGardenWorld from "\.\/BlockGardenWorld";/);
  assert.match(layout, /import "\.\/world\.css";/);

  await assert.rejects(access(new URL("../app/BlockGardenGame.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../app/globals.css", import.meta.url)));
});
