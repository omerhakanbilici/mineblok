import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("produces a self-contained Render static site", async () => {
  const [html, blueprint, nextConfig, viteConfig, packageText] = await Promise.all([
    readFile(new URL("../dist/client/index.html", import.meta.url), "utf8"),
    readFile(new URL("../render.yaml", import.meta.url), "utf8"),
    readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../vite.config.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);
  const packageJson = JSON.parse(packageText);

  assert.match(html, /<title>Mineblok \| Minik Kaşifler İçin Oyun<\/title>/);
  assert.match(html, /class="world-canvas mode-walk"/);
  assert.match(html, /OYNA<\/button>/);

  const assetPaths = [
    ...html.matchAll(/(?:href|src)="(\/_next\/[^"?]+)"/g),
  ].map((match) => match[1]);
  assert.ok(assetPaths.length > 0, "static HTML should reference built assets");
  await Promise.all(
    [...new Set(assetPaths)].map((assetPath) =>
      access(new URL(`../dist/client${assetPath}`, import.meta.url)),
    ),
  );

  assert.match(blueprint, /runtime: static/);
  assert.match(blueprint, /repo: https:\/\/github\.com\/omerhakanbilici\/mineblok/);
  assert.match(blueprint, /buildCommand: npm run build:render/);
  assert.match(blueprint, /staticPublishPath: \.\/dist\/client/);
  assert.match(blueprint, /autoDeployTrigger: commit/);
  assert.equal(packageJson.scripts["build:render"], "RENDER_STATIC_EXPORT=true vinext build");
  assert.match(nextConfig, /RENDER_STATIC_EXPORT/);
  assert.match(nextConfig, /output: "export"/);
  assert.match(viteConfig, /isRenderStaticBuild\s*\?\s*\[\]\s*:/);
});
