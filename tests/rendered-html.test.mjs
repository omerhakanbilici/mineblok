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
  assert.match(html, /class="scene-topbar"[\s\S]*class="scene-brand"[\s\S]*class="top-actions"/);
  assert.match(html, /class="fps-indicator fps-waiting"/);
  assert.match(html, /aria-label="100 can kaldı"/);
  assert.match(html, /aria-label="0 yıldız toplandı"/);
  assert.doesNotMatch(html, /0[\s\S]{0,30}\/ 3/);
  assert.match(html, /class="world-card"[\s\S]*class="tool-dock [^"]*"[\s\S]*<\/section>/);
  assert.match(html, />GEZ<\/strong>/);
  assert.match(html, />YAP<\/strong>/);
  assert.match(html, />GERİ AL<\/strong>/);
});

test("keeps camera, creatures, combat, and every control inside the game scene", async () => {
  const [game, css, page, layout, readme, agentGuide] = await Promise.all([
    readFile(new URL("../app/BlockGardenWorld.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/world.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
    readFile(new URL("../AGENTS.md", import.meta.url), "utf8"),
  ]);

  assert.match(game, /const WORLD_SIZE = 100;/);
  assert.match(game, /const MAX_HEALTH = 100;/);
  assert.match(game, /const CONTACT_DAMAGE = 2;/);
  assert.match(game, /const ENEMY_FIRST_HIT_DELAY = 1200;/);
  assert.match(game, /const AUTO_COUNTERATTACK_DELAY = 520;/);
  assert.match(game, /cameraRef\.current = playerWorld;/);
  assert.match(game, /drawVoxelPlayer/);
  assert.match(game, /function drawPlayerArm/);
  assert.match(game, /stepArc \* 2\.25/);
  assert.match(game, /stepArc \* 1\.45/);
  assert.match(game, /swordSwingProgress/);
  assert.match(game, /const surfaceY = center\.y \+ metrics\.tileH \* 0\.03;/);
  assert.match(game, /const shoeHeight = 7 \* unit;/);
  assert.match(game, /const climbLift = pose\.elevationDelta > 0/);
  assert.match(game, /const descentCrouch = pose\.elevationDelta < 0/);
  assert.match(game, /return world\[from\.y\]\[from\.x\]\.length === world\[to\.y\]\[to\.x\]\.length \? 270 : 440;/);
  assert.match(game, /function updateAnimal/);
  assert.match(game, /duration: 1150 \+ Math\.random\(\) \* 450/);
  assert.match(game, /type AnimalKind = "sheep" \| "chick" \| "cow" \| "pig" \| "rabbit";/);
  assert.match(game, /type EnemyState =/);
  assert.match(game, /function drawVoxelEnemy/);
  assert.match(game, /function updateEnemy/);
  assert.match(game, /function drawDustBurst/);
  assert.match(game, /const removeAnimalNear = useCallback/);
  assert.match(game, /const strikeEnemy = useCallback/);
  assert.match(game, /const swingSword = useCallback/);
  assert.match(game, /const stopWalking = useCallback/);
  assert.match(game, /const anchor = progress >= 0\.5 \? motion\.to : motion\.from;/);
  assert.match(game, /const start = stopWalking\(\);/);
  assert.match(game, /const current = stopWalking\(\);/);
  assert.match(game, /onClick=\{\(\) => \{ stopWalking\(\); setMode\("walk"\);/);
  assert.match(game, /onClick=\{\(\) => \{ stopWalking\(\); setMode\("build"\);/);
  assert.match(game, /onClick=\{\(\) => \{ stopWalking\(\); setMode\("remove"\);/);
  assert.doesNotMatch(game, /disabled=\{isWalking\}/);
  assert.doesNotMatch(game, /disabled=\{!started \|\| isWalking\}/);
  assert.doesNotMatch(game, /if \(walkRef\.current\) \{[\s\S]{0,160}Mino yürüyor/);
  assert.match(game, /healthRef\.current - CONTACT_DAMAGE/);
  assert.match(
    game,
    /healthRef\.current - CONTACT_DAMAGE[\s\S]*counterattackTargetIdRef\.current = nearbyEnemy\.enemy\.id/,
  );
  assert.match(game, /counterattackAtRef\.current = now \+ AUTO_COUNTERATTACK_DELAY/);
  assert.match(game, /event\.code === "Space"[\s\S]{0,160}startJump\(\)/);
  assert.match(game, /event\.code === "KeyF"[\s\S]{0,160}swingSword\(\)/);
  assert.match(game, /className=\{`sword-button/);
  assert.match(game, />KILIÇ<\/strong>/);
  assert.match(game, /title="Kılıçla manuel vur \(F tuşu\)"/);
  assert.match(game, /const startJump = useCallback/);
  assert.match(game, /const FIRST_JUMP_HEIGHT = 0\.72;/);
  assert.match(game, /const SECOND_JUMP_HEIGHT = 1\.45;/);
  assert.match(game, /const SECOND_JUMP_DURATION = 780;/);
  assert.match(game, /jumpRef\.current = \{\s*stage: 2,/);
  assert.match(game, /pose\.jumpStage === 2 \? 1\.05/);
  assert.match(game, /className="jump-button"/);
  assert.match(game, />ZIPLA<\/strong>/);
  assert.match(game, />BOŞLUK<\/small>/);
  assert.match(game, /function getFpsTone/);
  assert.match(game, /if \(fps < 20\) return "red";/);
  assert.match(game, /if \(fps < 30\) return "orange";/);
  assert.match(game, /if \(fps < 35\) return "yellow";/);
  assert.match(game, /const measuredFps = Math\.round/);
  assert.match(game, /function makeInitialStars/);
  assert.match(game, /starsRef\.current\.length >= 32/);
  assert.match(game, /setStarCount\(starCountRef\.current\)/);
  assert.doesNotMatch(game, /celebrating|STARS|hedef 3/);
  assert.match(game, /const TABLET_FRAME_INTERVAL = 1000 \/ 30;/);
  assert.match(game, /const TABLET_CANVAS_SCALE = 0\.8;/);
  assert.match(game, /const TABLET_CANVAS_PIXEL_BUDGET = 650_000;/);
  assert.match(game, /const CONSTRAINED_FRAME_INTERVAL = 1000 \/ 20;/);
  assert.match(game, /const CONSTRAINED_CANVAS_SCALE = 0\.6;/);
  assert.match(game, /const CONSTRAINED_CANVAS_PIXEL_BUDGET = 420_000;/);
  assert.match(game, /const LOW_POWER_MIN_CANVAS_SCALE = 0\.45;/);
  assert.match(game, /function detectRenderProfile/);
  assert.match(game, /function makeConstrainedProfile/);
  assert.match(game, /function getCanvasScale/);
  assert.match(game, /return Math\.max\(profile\.minScale,/);
  assert.match(game, /function drawTerrainLayer/);
  assert.match(game, /function createBlockSpriteAtlas/);
  assert.match(game, /const terrainCanvasRef = useRef<HTMLCanvasElement>\(null\);/);
  assert.match(game, /const terrainCacheRef = useRef<TerrainCache \| null>\(null\);/);
  assert.match(game, /previousCache\.world !== world/);
  assert.match(game, /drawFlower\(context, x, y, column\.length, metrics, 0\);/);
  assert.match(game, /terrainCache\.canvas\.style\.transform = `translate3d/);
  assert.match(game, /const decorativeTime = profile\.animateDecorations \? time : 0;/);
  assert.doesNotMatch(game, /context\.drawImage\(\s*terrainCache\.canvas/);
  assert.match(game, /document\.visibilityState !== "hidden"/);
  assert.doesNotMatch(game, /Math\.min\(window\.devicePixelRatio \|\| 1, 2\)/);
  assert.match(game, /<section className="world-card"[\s\S]*<header className="scene-topbar"/);
  assert.match(game, /<nav className=\{`tool-dock/);
  assert.match(game, /className="dpad"/);

  assert.match(css, /\.game-shell,[\s\S]*\.world-card[\s\S]*position:\s*fixed;[\s\S]*inset:\s*0;/);
  assert.match(css, /\.world-canvas[\s\S]*width:\s*100%;[\s\S]*height:\s*100%;/);
  assert.match(css, /\.world-terrain-canvas[\s\S]*will-change:\s*transform;/);
  assert.match(css, /@media \(pointer: coarse\), \(hover: none\)/);
  assert.match(css, /-webkit-backdrop-filter:\s*none;/);
  assert.match(css, /\.world-canvas\.is-walking\s*\{[\s\S]*cursor:\s*pointer;/);
  assert.match(css, /\.tool-dock[\s\S]*position:\s*absolute;/);
  assert.match(css, /\.sword-button[\s\S]*position:\s*absolute;/);
  assert.match(css, /\.jump-button[\s\S]*position:\s*absolute;/);
  assert.match(css, /\.fps-indicator[\s\S]*background:\s*rgba\(9, 22, 17, 0\.34\);/);
  assert.match(css, /-webkit-text-stroke:\s*1px rgba\(0, 0, 0, 0\.88\);/);
  assert.match(css, /\.fps-red\s*\{[\s\S]*#ff5252;/);
  assert.match(css, /\.fps-orange\s*\{[\s\S]*#ff9f43;/);
  assert.match(css, /\.fps-yellow\s*\{[\s\S]*#ffe65a;/);
  assert.match(css, /\.fps-green\s*\{[\s\S]*#65e572;/);
  assert.match(css, /\.health-goal\.danger/);
  assert.match(css, /\.scene-topbar[\s\S]*justify-content:\s*space-between;/);
  assert.match(page, /import BlockGardenWorld from "\.\/BlockGardenWorld";/);
  assert.match(layout, /import "\.\/world\.css";/);
  assert.match(readme, /### Kesilebilir hareket/);
  assert.match(readme, /## Tablet performansı/);
  assert.match(readme, /https:\/\/mineblok\.hakanbil\.chatgpt\.site\//);
  assert.match(readme, /npm test/);
  assert.match(agentGuide, /Never reintroduce `disabled=\{isWalking\}`/);
  assert.match(agentGuide, /## Interruptible movement state machine/);
  assert.match(agentGuide, /## Canvas performance contract/);
  assert.match(agentGuide, /guests can play without ChatGPT sign-in/);
  assert.match(agentGuide, /Deploy to the existing public access level/);

  await assert.rejects(access(new URL("../app/BlockGardenGame.tsx", import.meta.url)));
  await assert.rejects(access(new URL("../app/globals.css", import.meta.url)));
});
