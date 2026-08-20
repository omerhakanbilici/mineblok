# Mineblok Agent Guide

Read `README.md` before changing the project. This file is the implementation contract for coding agents; keep it synchronized with behavior changes.

## Product intent

Mineblok is a Turkish, child-friendly block-world playground designed to be understandable to a four-year-old. It should feel playful, forgiving, colorful, and immediately usable with touch. Combat is toy-like: there is no blood, injury detail, frightening copy, or graphic effect.

The live site is `https://mineblok.hakanbil.chatgpt.site/`. It is intentionally public so guests can play without ChatGPT sign-in. The game has no account-dependent backend or server-side personal data. The existing Sites project ID is declared in `.openai/hosting.json`; reuse it. Do not create a replacement project when updating this game.

## Non-negotiable behavior

- The world remains 100 × 100 cells and extends beyond the viewport.
- The camera follows Mino continuously so the player stays near screen center.
- The title and all gameplay controls remain inside the full-screen `world-card` scene.
- Never disable a gameplay control merely because Mino is walking.
- Any new destination, keyboard/D-pad direction, mode change, or sword action interrupts the current walk.
- On interruption, settle Mino on the nearest grid cell before starting the next command.
- Keep Pointer Events as the shared mouse and touch input path.
- UI copy remains short, friendly, and Turkish.
- Guest access remains public and does not require ChatGPT sign-in.
- Stars spawn indefinitely and the counter has no win threshold.
- Animals wander around distributed areas of the world.
- Enemies are visually distinct in red and combat remains non-graphic.

Never reintroduce `disabled={isWalking}`, `disabled={!started || isWalking}`, or an early `if (walkRef.current) return` in destination handling. Those patterns make touch movement uninterruptible.

## Current control contract

- Canvas press/tap: choose a reachable target and begin path movement.
- D-pad: move one grid cell diagonally in screen space.
- Arrow keys or WASD: same one-cell movement as the D-pad.
- `KILIÇ` button or Space: stop walking and swing immediately.
- `GEZ`, `YAP`, `GERİ AL`: stop walking, then switch mode.
- Build palette: choose the block used by `YAP`.
- Sound, reset, and fullscreen controls remain available during movement.

If a new input method is added, it must follow the same interruption contract.

## Source layout

- `app/BlockGardenWorld.tsx` owns almost all game behavior and Canvas rendering.
- `app/world.css` owns the full-screen scene, HUD placement, responsive rules, and control styling.
- `app/page.tsx` renders the game component.
- `app/layout.tsx` defines metadata and loads the stylesheet.
- `tests/rendered-html.test.mjs` checks server HTML plus critical source-level behavior contracts.
- `.openai/hosting.json` binds this checkout to the existing Sites project.

`app/BlockGardenWorld.tsx` is intentionally organized from low-level data and drawing helpers toward the React component:

1. Constants and type definitions
2. World/entity generation
3. Projection and primitive drawing helpers
4. Player, animal, enemy, and dust drawing
5. Pathfinding and autonomous entity updates
6. React refs/state and the animation loop
7. Arrival, combat, movement, pointer, keyboard, and button handlers
8. HUD and control markup

Prefer narrow changes inside that organization instead of splitting the engine casually. If the component is eventually modularized, preserve the order-dependent render pipeline and ref-based animation state.

## Coordinate and rendering model

- `world[y][x]` is a vertical `BlockKind[]` column.
- The visible surface height is `world[y][x].length - 1`.
- Grid positions use `{ x, y }`; camera/player render positions use `{ x, y, z }`.
- `tileCenter` projects grid coordinates to the shallow isometric screen plane.
- `cameraRef` follows the interpolated player world position, not only completed cells.
- Terrain and entities must remain depth-sorted so nearer objects draw over farther objects.

Avoid copying camera or coordinate formulas into event handlers. Use the existing projection/path helpers so pointer targeting, drawing, and movement remain consistent.

## React state versus animation refs

High-frequency simulation data belongs in refs (`playerRef`, `cameraRef`, `walkRef`, entity refs, combat timers, and effect refs). React state is for DOM/HUD changes such as mode, selected block, health, star count, sound, and whether walking/swinging affects CSS or accessibility.

Do not move per-frame positions into React state without measuring the render cost. When a ref value also appears in the HUD, update its paired state only when the displayed value changes.

## Interruptible movement state machine

`moveTo` accepts a target even while a previous path is active. It first calls `stopWalking`, calculates a path from the returned anchor, and starts the first segment.

`stopWalking` must:

1. Inspect the active `WalkMotion` and its elapsed progress.
2. Choose `from` before 50% progress or `to` at/after 50% progress.
3. Clear the active walk and set the player/camera refs to that exact cell.
4. Set `isWalking` false.
5. Run arrival side effects when the chosen anchor is the destination cell, so a crossed star or nearby entity is not skipped.
6. Return the anchor for the next command.

React may batch the false/true walking-state updates when redirection happens in one event; that is expected. The important state is `walkRef`, and the new segment should begin immediately.

When changing movement, manually verify these sequences:

- Tap a distant cell, then tap a different distant cell midway.
- Tap a distant cell, then use each D-pad direction midway.
- Tap a distant cell, then press an arrow/WASD key midway.
- Tap a distant cell, then switch to `YAP` or `GERİ AL` midway.
- Tap a distant cell, then use the sword midway.

Mino must never remain between cells or ignore the second action.

## Combat state machine

Relevant constants are near the top of `BlockGardenWorld.tsx`:

- `MAX_HEALTH = 100`
- `CONTACT_DAMAGE = 2`
- `ATTACK_RANGE = 1.45`
- `ENEMY_FIRST_HIT_DELAY = 1200`
- `AUTO_COUNTERATTACK_DELAY = 520`

Manual and automatic combat are both required:

- Manual sword input immediately interrupts movement and checks the current attack range.
- Animals in range are removed in one hit.
- An enemy in range can be removed manually before it damages Mino.
- If the player waits beside an enemy, the enemy lands the first 2-point hit after 1200 ms.
- The automatic counterattack removes that enemy 520 ms later if it is still valid and in range.
- Removal creates a dust burst and plays the appropriate non-graphic feedback.

Do not make enemy auto-attacks immediate, and do not remove the manual sword path when maintaining the automatic counterattack.

## UI and responsive layout

The scene is fixed to the viewport. HUD groups use absolute positioning inside `world-card`; there should be no external page gutter or control strip. Keep touch targets generous. Check that the title, health/star display, D-pad, sword, tool dock, and optional build palette do not overlap on narrow screens or landscape mobile layouts.

Walking may change animation or cursor styling, but it must not visually imply that controls are locked. The walking canvas cursor remains interactive.

## Validation workflow

Use Node.js `>=22.13.0` and run:

```bash
npm test
npm run lint
git diff --check
git status --short
```

`npm test` performs a production build before the Node test suite. Add a focused regression assertion when changing a critical behavior, but avoid assertions tied to incidental formatting.

For meaningful interaction or layout changes, also start `npm run dev`, open `http://localhost:3000/`, and exercise the changed path. Preserve unrelated user changes and review the final diff before committing.

## Sites publishing workflow

This project contains `.openai/hosting.json`, so use the Sites building and Sites hosting workflows. Keep the development server alive until publishing is complete.

1. Finish implementation and validation.
2. Open the coherent local build once for inspection.
3. Commit only intended files.
4. Obtain a fresh Sites source-repository credential; never print or persist its token.
5. Push the exact committed `HEAD` to the provided source repository and branch.
6. Package this exact checkout with the Sites `package-site.sh` helper.
7. Save a new version for the existing `project_id`, using the exact commit SHA and archive.
8. Deploy to the existing public access level; the user's explicit guest-access decision authorizes public deployment for Mineblok updates.
9. Poll deployment status until it succeeds or fails.
10. Open the live Mineblok URL, then stop the local server.

Do not write credentials into git configuration, shell history artifacts, project files, test fixtures, logs, or documentation. Do not make Mineblok private or add a sign-in gate unless the user explicitly requests that access change.

## Documentation maintenance

Update `README.md` when player-visible behavior, controls, setup, architecture, or deployment expectations change. Update this file when a future agent could otherwise violate an implementation invariant. Documentation changes should ship in the same commit as the behavior they describe.
