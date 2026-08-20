"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WORLD_SIZE = 100;
const MAX_HEIGHT = 6;
const MAX_HEALTH = 100;
const CONTACT_DAMAGE = 2;
const ATTACK_RANGE = 1.45;
const START_POINT = { x: 50, y: 50 };

type Mode = "walk" | "build" | "remove";
type BlockKind = "dirt" | "grass" | "sand" | "pink" | "blue" | "flower";
type BuildBlock = Exclude<BlockKind, "dirt">;
type World = BlockKind[][][];
type Point = { x: number; y: number };
type WorldPosition = { x: number; y: number; z: number };
type ScreenPoint = { x: number; y: number };
type WalkMotion = {
  from: Point;
  to: Point;
  startedAt: number;
  duration: number;
  remaining: Point[];
};
type PlayerPose = {
  walking: boolean;
  stepProgress: number;
  elevationDelta: number;
  swordSwingProgress: number | null;
};
type StarState = Point & { id: string };
type AnimalKind = "sheep" | "chick" | "cow" | "pig" | "rabbit";
type AnimalMotion = {
  from: Point;
  to: Point;
  startedAt: number;
  duration: number;
};
type AnimalState = {
  id: string;
  kind: AnimalKind;
  greeting: string;
  x: number;
  y: number;
  motion: AnimalMotion | null;
  nextMoveAt: number;
};
type EnemyState = {
  id: string;
  x: number;
  y: number;
  motion: AnimalMotion | null;
  nextMoveAt: number;
};
type DustBurst = {
  id: string;
  x: number;
  y: number;
  z: number;
  startedAt: number;
  color: string;
};
type Metrics = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  tileW: number;
  tileH: number;
  blockH: number;
  camera: WorldPosition;
};

const ANIMAL_SPAWNS: Array<{
  id: string;
  kind: AnimalKind;
  x: number;
  y: number;
  greeting: string;
}> = [
  { id: "koyun-merkez", kind: "sheep", x: 53, y: 49, greeting: "Koyun: Mee!" },
  { id: "civciv-merkez", kind: "chick", x: 49, y: 46, greeting: "Civciv: Cik cik!" },
  { id: "domuz-merkez", kind: "pig", x: 56, y: 54, greeting: "Domuzcuk: Oink!" },
  { id: "tavsan-merkez", kind: "rabbit", x: 44, y: 54, greeting: "Tavşan: Pıt pıt!" },
  { id: "inek-kuzeybati", kind: "cow", x: 18, y: 20, greeting: "İnek: Möö!" },
  { id: "koyun-kuzey", kind: "sheep", x: 32, y: 25, greeting: "Koyun: Mee!" },
  { id: "tavsan-kuzey", kind: "rabbit", x: 49, y: 18, greeting: "Tavşan: Pıt pıt!" },
  { id: "domuz-kuzeydogu", kind: "pig", x: 70, y: 22, greeting: "Domuzcuk: Oink!" },
  { id: "inek-kuzeydogu", kind: "cow", x: 84, y: 18, greeting: "İnek: Möö!" },
  { id: "civciv-bati", kind: "chick", x: 20, y: 45, greeting: "Civciv: Cik cik!" },
  { id: "inek-bati", kind: "cow", x: 37, y: 43, greeting: "İnek: Möö!" },
  { id: "domuz-dogu", kind: "pig", x: 69, y: 42, greeting: "Domuzcuk: Oink!" },
  { id: "tavsan-dogu", kind: "rabbit", x: 86, y: 46, greeting: "Tavşan: Pıt pıt!" },
  { id: "koyun-guneybati", kind: "sheep", x: 17, y: 70, greeting: "Koyun: Mee!" },
  { id: "inek-guneybati", kind: "cow", x: 34, y: 67, greeting: "İnek: Möö!" },
  { id: "civciv-guney", kind: "chick", x: 56, y: 70, greeting: "Civciv: Cik cik!" },
  { id: "domuz-guneydogu", kind: "pig", x: 75, y: 66, greeting: "Domuzcuk: Oink!" },
  { id: "tavsan-uzak-guneydogu", kind: "rabbit", x: 88, y: 78, greeting: "Tavşan: Pıt pıt!" },
  { id: "koyun-uzak-guneybati", kind: "sheep", x: 27, y: 86, greeting: "Koyun: Mee!" },
  { id: "inek-uzak-guney", kind: "cow", x: 52, y: 84, greeting: "İnek: Möö!" },
  { id: "domuz-uzak-guneydogu", kind: "pig", x: 74, y: 88, greeting: "Domuzcuk: Oink!" },
];

const BUILD_BLOCKS: Array<{ kind: BuildBlock; label: string; color: string; emoji: string }> = [
  { kind: "grass", label: "Çimen", color: "#72c95b", emoji: "🌱" },
  { kind: "sand", label: "Kum", color: "#f1cf73", emoji: "☀" },
  { kind: "pink", label: "Pembe", color: "#f58aaa", emoji: "♥" },
  { kind: "blue", label: "Mavi", color: "#68b8e8", emoji: "●" },
  { kind: "flower", label: "Çiçek", color: "#75c95f", emoji: "🌼" },
];

const BLOCK_COLORS: Record<BlockKind, { top: string; left: string; right: string }> = {
  dirt: { top: "#a9774e", left: "#835033", right: "#633c29" },
  grass: { top: "#70cc59", left: "#8c5d3b", right: "#70452f" },
  sand: { top: "#f3d27b", left: "#c99a4f", right: "#a9783f" },
  pink: { top: "#ff9eb9", left: "#d76488", right: "#ae496d" },
  blue: { top: "#70c2ef", left: "#428fc6", right: "#2e6fa8" },
  flower: { top: "#77ce5f", left: "#8c5d3b", right: "#70452f" },
};

const RESERVED_CELLS = new Set(
  [START_POINT, ...ANIMAL_SPAWNS].map((point) => `${point.x},${point.y}`),
);

function pseudoRandom(x: number, y: number) {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function makeInitialWorld(): World {
  return Array.from({ length: WORLD_SIZE }, (_, y) =>
    Array.from({ length: WORLD_SIZE }, (_, x) => {
      const edgeDistance = Math.min(x, y, WORLD_SIZE - 1 - x, WORLD_SIZE - 1 - y);
      if (edgeDistance < 2) return [];

      const distanceFromStart = Math.hypot(x - START_POINT.x, y - START_POINT.y);
      const rolling =
        Math.sin(x * 0.17) * 0.78 +
        Math.cos(y * 0.14) * 0.72 +
        Math.sin((x + y) * 0.085) * 0.58;
      let height = rolling > 1.15 ? 3 : rolling > 0.15 ? 2 : 1;
      if (distanceFromStart < 5) height = 1;
      if (ANIMAL_SPAWNS.some((animal) => Math.hypot(x - animal.x, y - animal.y) < 2.4)) height = 1;
      if (RESERVED_CELLS.has(`${x},${y}`)) height = 1;

      const biome = pseudoRandom(Math.floor(x / 4), Math.floor(y / 4));
      const detail = pseudoRandom(x, y);
      const isCoast = edgeDistance < 6;
      const top: BlockKind =
        detail > 0.965 && !isCoast ? "flower" : biome > 0.79 || isCoast ? "sand" : "grass";

      return Array.from({ length: height }, (_, z) => (z === height - 1 ? top : "dirt"));
    }),
  );
}

function makeAnimals(): AnimalState[] {
  return ANIMAL_SPAWNS.map((animal, index) => ({
    ...animal,
    motion: null,
    nextMoveAt: 1200 + index * 650,
  }));
}

function findStarSpot(
  world: World,
  origin: Point | null,
  occupied: Point[],
): Point | null {
  for (let attempt = 0; attempt < 700; attempt += 1) {
    let x: number;
    let y: number;
    if (origin) {
      const radius = 4 + Math.floor(Math.random() * 13);
      const angle = Math.random() * Math.PI * 2;
      x = Math.round(origin.x + Math.cos(angle) * radius);
      y = Math.round(origin.y + Math.sin(angle) * radius);
    } else {
      x = 4 + Math.floor(Math.random() * (WORLD_SIZE - 8));
      y = 4 + Math.floor(Math.random() * (WORLD_SIZE - 8));
    }
    if (x < 2 || y < 2 || x >= WORLD_SIZE - 2 || y >= WORLD_SIZE - 2) continue;
    if (world[y][x].length === 0) continue;
    if (Math.hypot(x - START_POINT.x, y - START_POINT.y) < 2.5) continue;
    if (occupied.some((point) => point.x === x && point.y === y)) continue;
    if (ANIMAL_SPAWNS.some((animal) => animal.x === x && animal.y === y)) continue;
    return { x, y };
  }
  return null;
}

function makeInitialStars(world: World): StarState[] {
  const stars: StarState[] = [];
  for (let index = 0; index < 24; index += 1) {
    const origin = index < 7 ? START_POINT : null;
    const point = findStarSpot(world, origin, stars);
    if (point) stars.push({ ...point, id: `ilk-yildiz-${index}` });
  }
  return stars;
}

function findEnemySpot(world: World, origin: Point | null, occupied: Point[]): Point | null {
  for (let attempt = 0; attempt < 700; attempt += 1) {
    let x: number;
    let y: number;
    if (origin) {
      const radius = 7 + Math.floor(Math.random() * 10);
      const angle = Math.random() * Math.PI * 2;
      x = Math.round(origin.x + Math.cos(angle) * radius);
      y = Math.round(origin.y + Math.sin(angle) * radius);
    } else {
      x = 5 + Math.floor(Math.random() * (WORLD_SIZE - 10));
      y = 5 + Math.floor(Math.random() * (WORLD_SIZE - 10));
    }
    if (x < 3 || y < 3 || x >= WORLD_SIZE - 3 || y >= WORLD_SIZE - 3) continue;
    if (world[y][x].length === 0) continue;
    if (Math.hypot(x - START_POINT.x, y - START_POINT.y) < 6) continue;
    if (occupied.some((point) => point.x === x && point.y === y)) continue;
    if (ANIMAL_SPAWNS.some((animal) => Math.hypot(animal.x - x, animal.y - y) < 2)) continue;
    return { x, y };
  }
  return null;
}

function makeEnemies(world: World): EnemyState[] {
  const enemies: EnemyState[] = [];
  for (let index = 0; index < 10; index += 1) {
    const point = findEnemySpot(world, index < 4 ? START_POINT : null, enemies);
    if (!point) continue;
    enemies.push({
      ...point,
      id: `golge-${index}`,
      motion: null,
      nextMoveAt: 1500 + index * 520,
    });
  }
  return enemies;
}

function polygon(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fill: string,
  stroke = "rgba(26, 45, 34, 0.18)",
) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  if (stroke !== "transparent") {
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.stroke();
  }
}

function getMetrics(width: number, height: number, camera: WorldPosition): Metrics {
  const tileW = Math.max(46, Math.min(190, width / 9.5, height / 5.8));
  return {
    width,
    height,
    centerX: width / 2,
    centerY: height * 0.49,
    tileW,
    tileH: tileW * 0.38,
    blockH: tileW * 0.52,
    camera,
  };
}

function tileCenter(x: number, y: number, columnHeight: number, metrics: Metrics): ScreenPoint {
  const relativeX = x - metrics.camera.x;
  const relativeY = y - metrics.camera.y;
  return {
    x: metrics.centerX + (relativeX - relativeY) * (metrics.tileW / 2),
    y:
      metrics.centerY +
      (relativeX + relativeY) * (metrics.tileH / 2) -
      (columnHeight - 1 - metrics.camera.z) * metrics.blockH,
  };
}

function drawBlock(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  z: number,
  kind: BlockKind,
  metrics: Metrics,
) {
  const center = tileCenter(x, y, z + 1, metrics);
  const halfW = metrics.tileW / 2;
  const halfH = metrics.tileH / 2;
  const colors = BLOCK_COLORS[kind];

  polygon(
    context,
    [
      [center.x - halfW, center.y],
      [center.x, center.y + halfH],
      [center.x, center.y + halfH + metrics.blockH],
      [center.x - halfW, center.y + metrics.blockH],
    ],
    colors.left,
  );
  polygon(
    context,
    [
      [center.x + halfW, center.y],
      [center.x, center.y + halfH],
      [center.x, center.y + halfH + metrics.blockH],
      [center.x + halfW, center.y + metrics.blockH],
    ],
    colors.right,
  );
  polygon(
    context,
    [
      [center.x, center.y - halfH],
      [center.x + halfW, center.y],
      [center.x, center.y + halfH],
      [center.x - halfW, center.y],
    ],
    colors.top,
  );

  context.strokeStyle = "rgba(255, 255, 255, 0.16)";
  context.lineWidth = Math.max(1, metrics.tileW * 0.012);
  context.beginPath();
  context.moveTo(center.x, center.y - halfH + 1);
  context.lineTo(center.x + halfW - 1, center.y);
  context.stroke();

  if (kind === "grass" || kind === "flower") {
    const detail = pseudoRandom(x * 3 + z, y * 5 + z);
    context.strokeStyle = "rgba(35, 115, 49, 0.42)";
    context.lineWidth = Math.max(1.5, metrics.tileW * 0.014);
    context.beginPath();
    context.moveTo(center.x - halfW * (0.5 + detail * 0.18), center.y - halfH * 0.03);
    context.lineTo(center.x - halfW * (0.38 + detail * 0.12), center.y - halfH * 0.28);
    context.moveTo(center.x + halfW * 0.25, center.y + halfH * 0.1);
    context.lineTo(center.x + halfW * 0.35, center.y - halfH * 0.14);
    context.stroke();
  }
}

function drawFlower(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  columnHeight: number,
  metrics: Metrics,
  time: number,
) {
  const center = tileCenter(x, y, columnHeight, metrics);
  const sway = Math.sin(time * 0.002 + x * 2) * metrics.tileW * 0.018;
  const baseY = center.y - metrics.tileH * 0.04;
  context.strokeStyle = "#317c43";
  context.lineWidth = Math.max(2, metrics.tileW * 0.025);
  context.beginPath();
  context.moveTo(center.x, baseY);
  context.lineTo(center.x + sway, baseY - metrics.blockH * 0.45);
  context.stroke();
  const flowerY = baseY - metrics.blockH * 0.5;
  const petalRadius = Math.max(3.5, metrics.tileW * 0.035);
  context.fillStyle = "#fff8fb";
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = (petal / 5) * Math.PI * 2;
    context.beginPath();
    context.arc(
      center.x + sway + Math.cos(angle) * petalRadius,
      flowerY + Math.sin(angle) * petalRadius,
      petalRadius * 0.82,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.fillStyle = "#f3b936";
  context.beginPath();
  context.arc(center.x + sway, flowerY, petalRadius * 0.8, 0, Math.PI * 2);
  context.fill();
}

function drawStar(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  columnHeight: number,
  metrics: Metrics,
  time: number,
) {
  const center = tileCenter(x, y, columnHeight, metrics);
  const radius = metrics.tileW * (0.14 + Math.sin(time * 0.005 + x) * 0.01);
  const starY = center.y - metrics.blockH * 0.72 + Math.sin(time * 0.003 + y) * 4;
  context.fillStyle = "rgba(255, 218, 72, 0.18)";
  context.beginPath();
  context.arc(center.x, starY, radius * 1.8, 0, Math.PI * 2);
  context.fill();
  context.save();
  context.translate(center.x, starY);
  context.rotate(time * 0.0007);
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const pointRadius = point % 2 === 0 ? radius : radius * 0.46;
    const px = Math.cos(angle) * pointRadius;
    const py = Math.sin(angle) * pointRadius;
    if (point === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
  context.fillStyle = "#ffd84e";
  context.fill();
  context.strokeStyle = "#df9f27";
  context.lineWidth = Math.max(2, metrics.tileW * 0.018);
  context.stroke();
  context.restore();
}

function drawCuboid(
  context: CanvasRenderingContext2D,
  x: number,
  bottomY: number,
  width: number,
  height: number,
  depth: number,
  colors: { front: string; side: string; top: string },
) {
  const left = x - width / 2;
  const right = x + width / 2;
  const top = bottomY - height;
  const dx = depth;
  const dy = -depth * 0.42;
  polygon(
    context,
    [
      [right, top],
      [right + dx, top + dy],
      [right + dx, bottomY + dy],
      [right, bottomY],
    ],
    colors.side,
    "rgba(23, 36, 29, 0.18)",
  );
  context.fillStyle = colors.front;
  context.fillRect(left, top, width, height);
  context.strokeStyle = "rgba(23, 36, 29, 0.18)";
  context.strokeRect(left, top, width, height);
  polygon(
    context,
    [
      [left, top],
      [right, top],
      [right + dx, top + dy],
      [left + dx, top + dy],
    ],
    colors.top,
    "rgba(23, 36, 29, 0.18)",
  );
}

function drawPlayerArm(
  context: CanvasRenderingContext2D,
  pivotX: number,
  pivotY: number,
  angle: number,
  unit: number,
  swordSwingProgress: number | null,
) {
  const armLength = 36 * unit;
  context.save();
  context.translate(pivotX, pivotY);
  context.rotate(angle);
  drawCuboid(context, 0, armLength, 9 * unit, armLength, 3 * unit, {
    front: "#d9a06d",
    side: "#aa724a",
    top: "#efbd8b",
  });
  context.restore();

  if (swordSwingProgress === -1) return;
  const handX = pivotX - Math.sin(angle) * armLength;
  const handY = pivotY + Math.cos(angle) * armLength;
  const swordAngle =
    swordSwingProgress === null ? 0.62 : -0.55 + swordSwingProgress * 2.2;
  context.save();
  context.translate(handX, handY);
  context.rotate(swordAngle);
  context.fillStyle = "#70472f";
  context.fillRect(-2.5 * unit, -2 * unit, 5 * unit, 13 * unit);
  context.fillStyle = "#e4b94d";
  context.fillRect(-9 * unit, -5 * unit, 18 * unit, 4.5 * unit);
  drawCuboid(context, 0, -5 * unit, 7 * unit, 35 * unit, 3 * unit, {
    front: "#e9f3f4",
    side: "#8ca9b1",
    top: "#ffffff",
  });
  context.restore();
}

function drawVoxelPlayer(
  context: CanvasRenderingContext2D,
  center: ScreenPoint,
  metrics: Metrics,
  time: number,
  pose: PlayerPose,
) {
  const unit = metrics.tileW / 105;
  const phase = pose.walking ? Math.sin(time * 0.02) : 0;
  const stepArc = pose.walking ? Math.sin(Math.PI * pose.stepProgress) : 0;
  const bounce = pose.walking ? Math.abs(Math.sin(time * 0.02)) * 1.5 * unit : 0;
  const climbLift = pose.elevationDelta > 0 ? stepArc * 8 * unit : 0;
  const descentCrouch = pose.elevationDelta < 0 ? stepArc * 6 * unit : 0;
  const surfaceY = center.y + metrics.tileH * 0.03;
  const groundY = surfaceY - bounce - climbLift;

  context.fillStyle = "rgba(21, 47, 32, 0.26)";
  context.beginPath();
  context.ellipse(center.x + 4 * unit, surfaceY + 3 * unit, 18 * unit, 5 * unit, 0, 0, Math.PI * 2);
  context.fill();

  const shoeHeight = 7 * unit;
  const leftShoeBottom = groundY - Math.max(0, phase) * 3 * unit;
  const rightShoeBottom = groundY - Math.max(0, -phase) * 3 * unit;
  const leftLegBottom = leftShoeBottom - shoeHeight;
  const rightLegBottom = rightShoeBottom - shoeHeight;
  const legHeight = (31 - descentCrouch / unit) * unit;
  drawCuboid(context, center.x - 8 * unit + phase * 3 * unit, leftLegBottom, 12 * unit, legHeight, 4 * unit, {
    front: "#315f9f",
    side: "#21497e",
    top: "#4779b7",
  });
  drawCuboid(context, center.x + 8 * unit - phase * 3 * unit, rightLegBottom, 12 * unit, legHeight, 4 * unit, {
    front: "#315f9f",
    side: "#21497e",
    top: "#4779b7",
  });
  drawCuboid(context, center.x - 8 * unit + phase * 3 * unit, leftShoeBottom, 14 * unit, shoeHeight, 6 * unit, {
    front: "#443f3b",
    side: "#272421",
    top: "#655f59",
  });
  drawCuboid(context, center.x + 8 * unit - phase * 3 * unit, rightShoeBottom, 14 * unit, shoeHeight, 6 * unit, {
    front: "#443f3b",
    side: "#272421",
    top: "#655f59",
  });

  const bodyBottom = groundY - 29 * unit + descentCrouch;
  drawCuboid(context, center.x, bodyBottom, 29 * unit, 39 * unit, 7 * unit, {
    front: "#3c9ea5",
    side: "#25747d",
    top: "#62bbc0",
  });
  const elevationArmAngle =
    pose.elevationDelta > 0
      ? stepArc * 2.25
      : pose.elevationDelta < 0
        ? stepArc * 1.45
        : 0;
  const walkingArmAngle = phase * 0.22;
  const swordArmSwing =
    pose.swordSwingProgress === null
      ? 0
      : Math.sin(Math.PI * pose.swordSwingProgress) * 1.1;
  const shoulderY = bodyBottom - 36 * unit;
  drawPlayerArm(
    context,
    center.x - 18 * unit,
    shoulderY,
    elevationArmAngle + walkingArmAngle,
    unit,
    -1,
  );
  drawPlayerArm(
    context,
    center.x + 18 * unit,
    shoulderY,
    -elevationArmAngle - walkingArmAngle + swordArmSwing,
    unit,
    pose.swordSwingProgress,
  );

  const headBottom = bodyBottom - 38 * unit;
  drawCuboid(context, center.x, headBottom, 35 * unit, 35 * unit, 9 * unit, {
    front: "#e7ad76",
    side: "#b97b4e",
    top: "#f2c08f",
  });
  context.fillStyle = "#3c3028";
  context.fillRect(center.x - 12 * unit, headBottom - 28 * unit, 8 * unit, 5 * unit);
  context.fillRect(center.x + 5 * unit, headBottom - 28 * unit, 8 * unit, 5 * unit);
  context.fillStyle = "#fff7e6";
  context.fillRect(center.x - 9.5 * unit, headBottom - 27 * unit, 2.5 * unit, 2.5 * unit);
  context.fillRect(center.x + 7.5 * unit, headBottom - 27 * unit, 2.5 * unit, 2.5 * unit);
  context.fillStyle = "#9a583f";
  context.fillRect(center.x - 4 * unit, headBottom - 14 * unit, 9 * unit, 3 * unit);
  context.fillStyle = "#6a3f2a";
  context.fillRect(center.x - 17.5 * unit, headBottom - 35 * unit, 35 * unit, 7 * unit);
  context.fillRect(center.x - 17.5 * unit, headBottom - 28 * unit, 5 * unit, 12 * unit);
}

function drawVoxelAnimal(
  context: CanvasRenderingContext2D,
  kind: AnimalKind,
  center: ScreenPoint,
  metrics: Metrics,
  time: number,
  walking: boolean,
) {
  const unit = metrics.tileW / 118;
  const phase = walking ? Math.sin(time * 0.014) : 0;
  const groundY = center.y - metrics.tileH * 0.02;
  context.fillStyle = "rgba(23, 49, 33, 0.2)";
  context.beginPath();
  context.ellipse(center.x + 4 * unit, center.y + metrics.tileH * 0.16, 18 * unit, 7 * unit, 0, 0, Math.PI * 2);
  context.fill();

  if (kind === "sheep") {
    for (const offset of [-15, -4, 9, 18]) {
      drawCuboid(context, center.x + offset * unit + phase * 1.5 * unit, groundY, 5 * unit, 18 * unit, 2 * unit, {
        front: "#77604d",
        side: "#4e3d32",
        top: "#9a8068",
      });
    }
    drawCuboid(context, center.x, groundY - 15 * unit, 45 * unit, 29 * unit, 9 * unit, {
      front: "#fffdf5",
      side: "#d7d1c4",
      top: "#ffffff",
    });
    drawCuboid(context, center.x + 29 * unit, groundY - 18 * unit, 22 * unit, 24 * unit, 6 * unit, {
      front: "#b59a7e",
      side: "#826b57",
      top: "#d1b79a",
    });
    context.fillStyle = "#2c2a27";
    context.fillRect(center.x + 31 * unit, groundY - 35 * unit, 4 * unit, 4 * unit);
    return;
  }

  if (kind === "chick") {
    drawCuboid(context, center.x, groundY, 24 * unit, 25 * unit, 6 * unit, {
      front: "#ffd84e",
      side: "#d6a72f",
      top: "#ffea85",
    });
    drawCuboid(context, center.x + 3 * unit, groundY - 23 * unit, 21 * unit, 20 * unit, 5 * unit, {
      front: "#ffe26a",
      side: "#d8ae3c",
      top: "#fff09d",
    });
    polygon(
      context,
      [
        [center.x + 14 * unit, groundY - 34 * unit],
        [center.x + 25 * unit, groundY - 30 * unit],
        [center.x + 14 * unit, groundY - 26 * unit],
      ],
      "#f08d35",
      "transparent",
    );
    context.fillStyle = "#2c2a27";
    context.fillRect(center.x + 7 * unit, groundY - 38 * unit, 3 * unit, 3 * unit);
    return;
  }

  if (kind === "cow") {
    for (const offset of [-16, -5, 10, 19]) {
      drawCuboid(context, center.x + offset * unit + phase * 1.3 * unit, groundY, 6 * unit, 19 * unit, 2 * unit, {
        front: "#4b3528",
        side: "#2f211a",
        top: "#6b4d3b",
      });
    }
    drawCuboid(context, center.x, groundY - 17 * unit, 49 * unit, 31 * unit, 10 * unit, {
      front: "#8a5d40",
      side: "#5d3b2b",
      top: "#b7825d",
    });
    context.fillStyle = "#f2e6ce";
    context.fillRect(center.x - 19 * unit, groundY - 43 * unit, 16 * unit, 12 * unit);
    drawCuboid(context, center.x + 31 * unit, groundY - 19 * unit, 24 * unit, 26 * unit, 6 * unit, {
      front: "#eee3cb",
      side: "#af987e",
      top: "#fff4dd",
    });
    context.fillStyle = "#2c2723";
    context.fillRect(center.x + 34 * unit, groundY - 38 * unit, 4 * unit, 4 * unit);
    polygon(context, [[center.x + 20 * unit, groundY - 45 * unit], [center.x + 15 * unit, groundY - 54 * unit], [center.x + 26 * unit, groundY - 47 * unit]], "#ead6a5", "transparent");
    polygon(context, [[center.x + 42 * unit, groundY - 45 * unit], [center.x + 48 * unit, groundY - 54 * unit], [center.x + 37 * unit, groundY - 47 * unit]], "#ead6a5", "transparent");
    return;
  }

  if (kind === "pig") {
    for (const offset of [-14, -3, 10, 18]) {
      drawCuboid(context, center.x + offset * unit + phase * 1.4 * unit, groundY, 5 * unit, 14 * unit, 2 * unit, {
        front: "#d97b8e",
        side: "#b95b73",
        top: "#ef9bab",
      });
    }
    drawCuboid(context, center.x, groundY - 12 * unit, 43 * unit, 27 * unit, 9 * unit, {
      front: "#f08fa2",
      side: "#ce677e",
      top: "#ffaabc",
    });
    drawCuboid(context, center.x + 28 * unit, groundY - 13 * unit, 23 * unit, 23 * unit, 6 * unit, {
      front: "#f59bad",
      side: "#cf6d82",
      top: "#ffb6c3",
    });
    context.fillStyle = "#bd5d72";
    context.fillRect(center.x + 34 * unit, groundY - 25 * unit, 10 * unit, 7 * unit);
    context.fillStyle = "#34292a";
    context.fillRect(center.x + 31 * unit, groundY - 32 * unit, 3 * unit, 3 * unit);
    return;
  }

  drawCuboid(context, center.x - 3 * unit, groundY, 29 * unit, 24 * unit, 7 * unit, {
    front: "#d7d2c6",
    side: "#aaa49a",
    top: "#ece8df",
  });
  drawCuboid(context, center.x + 12 * unit, groundY - 21 * unit, 21 * unit, 23 * unit, 5 * unit, {
    front: "#ded9ce",
    side: "#aaa49a",
    top: "#f1ede5",
  });
  drawCuboid(context, center.x + 7 * unit, groundY - 42 * unit, 6 * unit, 22 * unit, 2 * unit, {
    front: "#d8d3c9",
    side: "#aaa49a",
    top: "#f1ede5",
  });
  drawCuboid(context, center.x + 18 * unit, groundY - 42 * unit, 6 * unit, 22 * unit, 2 * unit, {
    front: "#d8d3c9",
    side: "#aaa49a",
    top: "#f1ede5",
  });
  context.fillStyle = "#2d2927";
  context.fillRect(center.x + 16 * unit, groundY - 37 * unit, 3 * unit, 3 * unit);
  drawCuboid(context, center.x - 15 * unit + phase * 2 * unit, groundY + 1 * unit, 13 * unit, 7 * unit, 4 * unit, {
    front: "#bdb7ab",
    side: "#8f897e",
    top: "#ded9ce",
  });
}

function drawVoxelEnemy(
  context: CanvasRenderingContext2D,
  center: ScreenPoint,
  metrics: Metrics,
  time: number,
  walking: boolean,
) {
  const unit = metrics.tileW / 108;
  const phase = walking ? Math.sin(time * 0.022) : 0;
  const groundY = center.y + metrics.tileH * 0.02;
  const pulse = 0.72 + Math.sin(time * 0.008) * 0.14;

  context.fillStyle = `rgba(116, 28, 63, ${pulse * 0.25})`;
  context.beginPath();
  context.ellipse(center.x + 3 * unit, groundY + 3 * unit, 24 * unit, 10 * unit, 0, 0, Math.PI * 2);
  context.fill();

  for (const offset of [-8, 8]) {
    drawCuboid(context, center.x + offset * unit + phase * 2 * unit, groundY, 12 * unit, 28 * unit, 4 * unit, {
      front: "#52193e",
      side: "#2f1027",
      top: "#762756",
    });
  }
  const bodyBottom = groundY - 26 * unit;
  drawCuboid(context, center.x, bodyBottom, 34 * unit, 38 * unit, 8 * unit, {
    front: "#b52c45",
    side: "#711b39",
    top: "#e34a55",
  });
  drawCuboid(context, center.x - 23 * unit - phase * 2 * unit, bodyBottom - 1 * unit, 9 * unit, 34 * unit, 3 * unit, {
    front: "#76204b",
    side: "#47152f",
    top: "#a03264",
  });
  drawCuboid(context, center.x + 23 * unit + phase * 2 * unit, bodyBottom - 1 * unit, 9 * unit, 34 * unit, 3 * unit, {
    front: "#76204b",
    side: "#47152f",
    top: "#a03264",
  });
  const headBottom = bodyBottom - 37 * unit;
  drawCuboid(context, center.x, headBottom, 34 * unit, 34 * unit, 9 * unit, {
    front: "#6f2148",
    side: "#41132f",
    top: "#98305b",
  });
  polygon(context, [[center.x - 15 * unit, headBottom - 32 * unit], [center.x - 22 * unit, headBottom - 51 * unit], [center.x - 5 * unit, headBottom - 35 * unit]], "#351026", "transparent");
  polygon(context, [[center.x + 15 * unit, headBottom - 32 * unit], [center.x + 22 * unit, headBottom - 51 * unit], [center.x + 5 * unit, headBottom - 35 * unit]], "#351026", "transparent");
  context.fillStyle = "#ffe04e";
  context.fillRect(center.x - 12 * unit, headBottom - 26 * unit, 9 * unit, 5 * unit);
  context.fillRect(center.x + 4 * unit, headBottom - 26 * unit, 9 * unit, 5 * unit);
  context.fillStyle = "#2a0a1d";
  context.fillRect(center.x - 2 * unit, headBottom - 12 * unit, 10 * unit, 3 * unit);
}

function drawDustBurst(
  context: CanvasRenderingContext2D,
  burst: DustBurst,
  metrics: Metrics,
  time: number,
) {
  const progress = Math.min(1, Math.max(0, (time - burst.startedAt) / 720));
  const center = tileCenter(burst.x, burst.y, burst.z + 1, metrics);
  const unit = metrics.tileW / 100;
  context.save();
  context.globalAlpha = 1 - progress;
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2 + index * 0.31;
    const distance = progress * (14 + (index % 5) * 5) * unit;
    const size = (4 + (index % 3) * 2) * unit * (1 - progress * 0.45);
    const x = center.x + Math.cos(angle) * distance;
    const y = center.y - metrics.blockH * 0.28 + Math.sin(angle) * distance - progress * 12 * unit;
    context.fillStyle = index % 3 === 0 ? "#f4ead8" : burst.color;
    context.fillRect(x - size / 2, y - size / 2, size, size);
  }
  context.restore();
}

function isSamePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function movingEntityPoint(
  entity: { x: number; y: number; motion: AnimalMotion | null },
  time: number,
): Point {
  if (!entity.motion) return { x: entity.x, y: entity.y };
  const progress = Math.min(
    1,
    Math.max(0, (time - entity.motion.startedAt) / entity.motion.duration),
  );
  const eased = progress * progress * (3 - 2 * progress);
  return {
    x: entity.motion.from.x + (entity.motion.to.x - entity.motion.from.x) * eased,
    y: entity.motion.from.y + (entity.motion.to.y - entity.motion.from.y) * eased,
  };
}

function isWalkable(world: World, from: Point, to: Point) {
  if (to.x < 0 || to.y < 0 || to.x >= WORLD_SIZE || to.y >= WORLD_SIZE) return false;
  const fromHeight = world[from.y][from.x].length;
  const toHeight = world[to.y][to.x].length;
  return toHeight > 0 && Math.abs(toHeight - fromHeight) <= 1;
}

function getWalkDuration(world: World, from: Point, to: Point) {
  return world[from.y][from.x].length === world[to.y][to.x].length ? 270 : 440;
}

function findWalkingPath(world: World, start: Point, target: Point) {
  if (isSamePoint(start, target)) return [];
  const key = (point: Point) => point.y * WORLD_SIZE + point.x;
  const queue: Point[] = [start];
  let head = 0;
  const visited = new Set([key(start)]);
  const previous = new Map<number, Point>();
  const directions = [
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
  ];

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    for (const direction of directions) {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      if (!isWalkable(world, current, next) || visited.has(key(next))) continue;
      visited.add(key(next));
      previous.set(key(next), current);
      if (isSamePoint(next, target)) {
        const path: Point[] = [next];
        let cursor = current;
        while (!isSamePoint(cursor, start)) {
          path.unshift(cursor);
          const parent = previous.get(key(cursor));
          if (!parent) break;
          cursor = parent;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return [];
}

function updateAnimal(animal: AnimalState, world: World, time: number, active: boolean) {
  if (animal.motion && time - animal.motion.startedAt >= animal.motion.duration) {
    animal.x = animal.motion.to.x;
    animal.y = animal.motion.to.y;
    animal.motion = null;
    animal.nextMoveAt = time + 1300 + Math.random() * 2400;
  }

  if (!animal.motion && active && time >= animal.nextMoveAt) {
    const current = { x: animal.x, y: animal.y };
    const options = [
      { x: animal.x - 1, y: animal.y },
      { x: animal.x + 1, y: animal.y },
      { x: animal.x, y: animal.y - 1 },
      { x: animal.x, y: animal.y + 1 },
    ].filter((next) => isWalkable(world, current, next));
    const next = options[Math.floor(Math.random() * options.length)];
    if (next) {
      animal.motion = {
        from: current,
        to: next,
        startedAt: time,
        duration: 1150 + Math.random() * 450,
      };
    } else {
      animal.nextMoveAt = time + 1800;
    }
  }

  if (!animal.motion) {
    return {
      x: animal.x,
      y: animal.y,
      z: Math.max(0, world[animal.y][animal.x].length - 1),
      moving: false,
    };
  }

  const progress = Math.min(1, Math.max(0, (time - animal.motion.startedAt) / animal.motion.duration));
  const eased = progress * progress * (3 - 2 * progress);
  const fromHeight = world[animal.motion.from.y][animal.motion.from.x].length - 1;
  const toHeight = world[animal.motion.to.y][animal.motion.to.x].length - 1;
  return {
    x: animal.motion.from.x + (animal.motion.to.x - animal.motion.from.x) * eased,
    y: animal.motion.from.y + (animal.motion.to.y - animal.motion.from.y) * eased,
    z: fromHeight + (toHeight - fromHeight) * eased,
    moving: true,
  };
}

function updateEnemy(enemy: EnemyState, world: World, time: number, active: boolean) {
  if (enemy.motion && time - enemy.motion.startedAt >= enemy.motion.duration) {
    enemy.x = enemy.motion.to.x;
    enemy.y = enemy.motion.to.y;
    enemy.motion = null;
    enemy.nextMoveAt = time + 700 + Math.random() * 1300;
  }

  if (!enemy.motion && active && time >= enemy.nextMoveAt) {
    const current = { x: enemy.x, y: enemy.y };
    const options = [
      { x: enemy.x - 1, y: enemy.y },
      { x: enemy.x + 1, y: enemy.y },
      { x: enemy.x, y: enemy.y - 1 },
      { x: enemy.x, y: enemy.y + 1 },
    ].filter((next) => isWalkable(world, current, next));
    const next = options[Math.floor(Math.random() * options.length)];
    if (next) {
      enemy.motion = {
        from: current,
        to: next,
        startedAt: time,
        duration: 820 + Math.random() * 380,
      };
    } else {
      enemy.nextMoveAt = time + 1200;
    }
  }

  if (!enemy.motion) {
    return {
      x: enemy.x,
      y: enemy.y,
      z: Math.max(0, world[enemy.y][enemy.x].length - 1),
      moving: false,
    };
  }

  const progress = Math.min(1, Math.max(0, (time - enemy.motion.startedAt) / enemy.motion.duration));
  const eased = progress * progress * (3 - 2 * progress);
  const fromHeight = world[enemy.motion.from.y][enemy.motion.from.x].length - 1;
  const toHeight = world[enemy.motion.to.y][enemy.motion.to.x].length - 1;
  return {
    x: enemy.motion.from.x + (enemy.motion.to.x - enemy.motion.from.x) * eased,
    y: enemy.motion.from.y + (enemy.motion.to.y - enemy.motion.from.y) * eased,
    z: fromHeight + (toHeight - fromHeight) * eased,
    moving: true,
  };
}

export default function BlockGardenWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<Point>({ ...START_POINT });
  const cameraRef = useRef<WorldPosition>({ x: START_POINT.x, y: START_POINT.y, z: 0 });
  const walkRef = useRef<WalkMotion | null>(null);
  const arrivalRef = useRef<(point: Point, finalStep: boolean) => void>(() => undefined);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>("walk");
  const [selectedBlock, setSelectedBlock] = useState<BuildBlock>("grass");
  const [world, setWorld] = useState<World>(() => makeInitialWorld());
  const [stars, setStars] = useState<StarState[]>(() => makeInitialStars(world));
  const starsRef = useRef<StarState[]>(stars);
  const starIdRef = useRef(stars.length);
  const starCountRef = useRef(0);
  const animalsRef = useRef<AnimalState[]>(makeAnimals());
  const [initialEnemies] = useState<EnemyState[]>(() => makeEnemies(world));
  const enemiesRef = useRef<EnemyState[]>(initialEnemies);
  const enemyIdRef = useRef(10);
  const dustRef = useRef<DustBurst[]>([]);
  const dustIdRef = useRef(0);
  const swordSwingStartedAtRef = useRef(-1000);
  const dangerStartedAtRef = useRef<number | null>(null);
  const lastDamageAtRef = useRef(0);
  const dangerNearbyRef = useRef(false);
  const healthRef = useRef(MAX_HEALTH);
  const [starCount, setStarCount] = useState(0);
  const [health, setHealth] = useState(MAX_HEALTH);
  const [dangerNearby, setDangerNearby] = useState(false);
  const [message, setMessage] = useState("Gitmek istediğin yere dokun");
  const [soundOn, setSoundOn] = useState(true);
  const [isWalking, setIsWalking] = useState(false);

  const playSound = useCallback(
    (kind: "start" | "step" | "build" | "remove" | "star" | "hello" | "oops" | "hit" | "hurt") => {
      if (!soundOn || typeof window === "undefined") return;
      const AudioConstructor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioConstructor) return;
      const audio = audioRef.current ?? new AudioConstructor();
      audioRef.current = audio;
      if (audio.state === "suspended") void audio.resume();
      const notes: Record<typeof kind, number[]> = {
        start: [392, 523, 659],
        step: [330],
        build: [440, 554],
        remove: [240, 190],
        star: [523, 659, 784, 1046],
        hello: [659, 784],
        oops: [220, 196],
        hit: [520, 330],
        hurt: [180, 145],
      };
      notes[kind].forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const begins = audio.currentTime + index * 0.085;
        oscillator.type = kind === "remove" || kind === "oops" || kind === "hurt" ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, begins);
        gain.gain.setValueAtTime(0.0001, begins);
        gain.gain.exponentialRampToValueAtTime(kind === "step" ? 0.03 : 0.07, begins + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, begins + 0.16);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(begins);
        oscillator.stop(begins + 0.18);
      });
    },
    [soundOn],
  );

  const draw = useCallback(
    (rawTime: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const bounds = canvas.getBoundingClientRect();
      if (bounds.width === 0 || bounds.height === 0) return;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const targetWidth = Math.round(bounds.width * scale);
      const targetHeight = Math.round(bounds.height * scale);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(scale, 0, 0, scale, 0, 0);
      const width = bounds.width;
      const height = bounds.height;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const time = reducedMotion ? 0 : rawTime;
      const swingAge = rawTime - swordSwingStartedAtRef.current;
      const swordSwingProgress = swingAge >= 0 && swingAge < 380 ? swingAge / 380 : null;

      let playerWorld: WorldPosition = {
        x: playerRef.current.x,
        y: playerRef.current.y,
        z: Math.max(0, world[playerRef.current.y][playerRef.current.x].length - 1),
      };
      let playerPose: PlayerPose = {
        walking: false,
        stepProgress: 0,
        elevationDelta: 0,
        swordSwingProgress,
      };
      const activeMotion = walkRef.current;
      if (activeMotion) {
        if (rawTime - activeMotion.startedAt >= activeMotion.duration) {
          const arrived = activeMotion.to;
          playerRef.current = arrived;
          const finalStep = activeMotion.remaining.length === 0;
          arrivalRef.current(arrived, finalStep);
          if (finalStep) {
            walkRef.current = null;
            setIsWalking(false);
          } else {
            const [next, ...remaining] = activeMotion.remaining;
            walkRef.current = {
              from: arrived,
              to: next,
              remaining,
              startedAt: rawTime,
              duration: getWalkDuration(world, arrived, next),
            };
            playSound("step");
          }
        }

        const currentMotion = walkRef.current;
        if (currentMotion) {
          const rawProgress = Math.min(
            1,
            Math.max(0, (rawTime - currentMotion.startedAt) / currentMotion.duration),
          );
          const progress = rawProgress * rawProgress * (3 - 2 * rawProgress);
          const fromHeight = world[currentMotion.from.y][currentMotion.from.x].length - 1;
          const toHeight = world[currentMotion.to.y][currentMotion.to.x].length - 1;
          playerWorld = {
            x: currentMotion.from.x + (currentMotion.to.x - currentMotion.from.x) * progress,
            y: currentMotion.from.y + (currentMotion.to.y - currentMotion.from.y) * progress,
            z: fromHeight + (toHeight - fromHeight) * progress,
          };
          playerPose = {
            walking: true,
            stepProgress: rawProgress,
            elevationDelta: Math.sign(toHeight - fromHeight),
            swordSwingProgress,
          };
        } else {
          playerWorld = {
            x: playerRef.current.x,
            y: playerRef.current.y,
            z: Math.max(0, world[playerRef.current.y][playerRef.current.x].length - 1),
          };
        }
      }

      cameraRef.current = playerWorld;
      const metrics = getMetrics(width, height, playerWorld);
      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#78c8ea");
      sky.addColorStop(0.56, "#a9e2f0");
      sky.addColorStop(1, "#d4edca");
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      const glow = context.createRadialGradient(width * 0.82, height * 0.16, 0, width * 0.82, height * 0.16, width * 0.28);
      glow.addColorStop(0, "rgba(255, 239, 149, 0.38)");
      glow.addColorStop(1, "rgba(255, 239, 149, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);

      const horizontalRange = Math.ceil(width / metrics.tileW) + 7;
      const verticalRange = Math.ceil(height / Math.max(1, metrics.tileH)) / 2 + 7;
      const range = Math.min(24, Math.max(13, Math.ceil(horizontalRange), Math.ceil(verticalRange)));
      const minX = Math.max(0, Math.floor(playerWorld.x) - range);
      const maxX = Math.min(WORLD_SIZE - 1, Math.ceil(playerWorld.x) + range);
      const minY = Math.max(0, Math.floor(playerWorld.y) - range);
      const maxY = Math.min(WORLD_SIZE - 1, Math.ceil(playerWorld.y) + range);

      for (let diagonal = minX + minY; diagonal <= maxX + maxY; diagonal += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const y = diagonal - x;
          if (y < minY || y > maxY) continue;
          const column = world[y][x];
          if (column.length === 0) continue;
          const topCenter = tileCenter(x, y, column.length, metrics);
          if (
            topCenter.x < -metrics.tileW ||
            topCenter.x > width + metrics.tileW ||
            topCenter.y < -metrics.blockH * 3 ||
            topCenter.y > height + metrics.blockH * 2
          ) {
            continue;
          }
          column.forEach((kind, z) => drawBlock(context, x, y, z, kind, metrics));
          if (column.at(-1) === "flower") drawFlower(context, x, y, column.length, metrics, time);
        }
      }

      for (const star of stars) {
        const column = world[star.y][star.x];
        if (column.length === 0) continue;
        const center = tileCenter(star.x, star.y, column.length, metrics);
        if (center.x > -80 && center.x < width + 80 && center.y > -80 && center.y < height + 80) {
          drawStar(context, star.x, star.y, column.length, metrics, time);
        }
      }

      for (const animal of animalsRef.current) {
        const rendered = updateAnimal(animal, world, rawTime, started);
        const center = tileCenter(rendered.x, rendered.y, rendered.z + 1, metrics);
        if (center.x > -120 && center.x < width + 120 && center.y > -120 && center.y < height + 120) {
          drawVoxelAnimal(context, animal.kind, center, metrics, time, rendered.moving);
        }
      }

      for (const enemy of enemiesRef.current) {
        const rendered = updateEnemy(enemy, world, rawTime, started);
        const center = tileCenter(rendered.x, rendered.y, rendered.z + 1, metrics);
        if (center.x > -120 && center.x < width + 120 && center.y > -120 && center.y < height + 120) {
          drawVoxelEnemy(context, center, metrics, time, rendered.moving);
        }
      }

      dustRef.current = dustRef.current.filter((burst) => rawTime - burst.startedAt < 720);
      for (const burst of dustRef.current) drawDustBurst(context, burst, metrics, rawTime);

      const playerCenter = tileCenter(playerWorld.x, playerWorld.y, playerWorld.z + 1, metrics);
      drawVoxelPlayer(context, playerCenter, metrics, time, playerPose);
    },
    [playSound, started, stars, world],
  );

  useEffect(() => {
    let frame = 0;
    const render = (time: number) => {
      draw(time);
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, [draw]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => {
      if (starsRef.current.length >= 32) return;
      const point = findStarSpot(world, playerRef.current, starsRef.current);
      if (!point) return;
      starIdRef.current += 1;
      const nextStars = [
        ...starsRef.current,
        { ...point, id: `gezgin-yildiz-${starIdRef.current}` },
      ];
      starsRef.current = nextStars;
      setStars(nextStars);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [started, world]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => {
      if (enemiesRef.current.length >= 18) return;
      const occupied: Point[] = [
        ...enemiesRef.current.map((enemy) => movingEntityPoint(enemy, performance.now())),
        ...animalsRef.current.map((animal) => movingEntityPoint(animal, performance.now())),
        ...starsRef.current,
      ];
      const point = findEnemySpot(
        world,
        Math.random() < 0.55 ? playerRef.current : null,
        occupied,
      );
      if (!point) return;
      enemyIdRef.current += 1;
      enemiesRef.current.push({
        ...point,
        id: `gezgin-golge-${enemyIdRef.current}`,
        motion: null,
        nextMoveAt: performance.now() + 900,
      });
    }, 6800);
    return () => window.clearInterval(timer);
  }, [started, world]);

  const collectAt = useCallback(
    (point: Point) => {
      const star = starsRef.current.find((candidate) => isSamePoint(candidate, point));
      if (!star) return false;
      const remainingStars = starsRef.current.filter((candidate) => candidate.id !== star.id);
      const replacementPoint = findStarSpot(world, point, [...remainingStars, point]);
      starIdRef.current += 1;
      const nextStars = replacementPoint
        ? [
            ...remainingStars,
            { ...replacementPoint, id: `toplanan-yildiz-${starIdRef.current}` },
          ]
        : remainingStars;
      starsRef.current = nextStars;
      setStars(nextStars);
      starCountRef.current += 1;
      setStarCount(starCountRef.current);
      playSound("star");
      setMessage(`Yaşasın! Toplam ${starCountRef.current} yıldızın oldu!`);
      return true;
    },
    [playSound, world],
  );

  const addDust = useCallback(
    (point: Point, color: string) => {
      const tileX = Math.max(0, Math.min(WORLD_SIZE - 1, Math.round(point.x)));
      const tileY = Math.max(0, Math.min(WORLD_SIZE - 1, Math.round(point.y)));
      dustIdRef.current += 1;
      dustRef.current.push({
        id: `toz-${dustIdRef.current}`,
        x: point.x,
        y: point.y,
        z: Math.max(0, world[tileY][tileX].length - 1),
        startedAt: performance.now(),
        color,
      });
      if (dustRef.current.length > 30) dustRef.current.shift();
    },
    [world],
  );

  const removeAnimalNear = useCallback(
    (point: Point) => {
      const now = performance.now();
      let nearest: { animal: AnimalState; position: Point; distance: number } | null = null;
      for (const animal of animalsRef.current) {
        const position = movingEntityPoint(animal, now);
        const distance = Math.hypot(position.x - point.x, position.y - point.y);
        if (distance <= ATTACK_RANGE && (!nearest || distance < nearest.distance)) {
          nearest = { animal, position, distance };
        }
      }
      if (!nearest) return false;

      animalsRef.current = animalsRef.current.filter(
        (animal) => animal.id !== nearest?.animal.id,
      );
      swordSwingStartedAtRef.current = now;
      addDust(nearest.position, "#c9b38f");
      playSound("hit");
      setMessage("Şak! Hayvan küçük bir toz bulutuyla kayboldu");
      return true;
    },
    [addDust, playSound],
  );

  const swingSword = useCallback(() => {
    const now = performance.now();
    swordSwingStartedAtRef.current = now;
    const player = playerRef.current;
    let nearest: { enemy: EnemyState; position: Point; distance: number } | null = null;
    for (const enemy of enemiesRef.current) {
      const position = movingEntityPoint(enemy, now);
      const distance = Math.hypot(position.x - player.x, position.y - player.y);
      if (distance <= ATTACK_RANGE && (!nearest || distance < nearest.distance)) {
        nearest = { enemy, position, distance };
      }
    }

    if (nearest) {
      enemiesRef.current = enemiesRef.current.filter(
        (enemy) => enemy.id !== nearest?.enemy.id,
      );
      addDust(nearest.position, "#a52e55");
      dangerStartedAtRef.current = null;
      lastDamageAtRef.current = now;
      dangerNearbyRef.current = false;
      setDangerNearby(false);
      playSound("hit");
      setMessage("Harika vuruş! Kötü gölge toz olup kayboldu");
      return;
    }

    if (!removeAnimalNear(player)) {
      playSound("hit");
      setMessage("Kılıç hazır — biraz daha yaklaş!");
    }
  }, [addDust, playSound, removeAnimalNear]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => {
      removeAnimalNear(playerRef.current);
    }, 140);
    return () => window.clearInterval(timer);
  }, [removeAnimalNear, started]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const player = playerRef.current;
      const enemyNearby = enemiesRef.current.some((enemy) => {
        const position = movingEntityPoint(enemy, now);
        return Math.hypot(position.x - player.x, position.y - player.y) <= ATTACK_RANGE;
      });

      if (!enemyNearby) {
        dangerStartedAtRef.current = null;
        lastDamageAtRef.current = 0;
        if (dangerNearbyRef.current) {
          dangerNearbyRef.current = false;
          setDangerNearby(false);
        }
        return;
      }

      if (!dangerNearbyRef.current) {
        dangerNearbyRef.current = true;
        setDangerNearby(true);
      }
      if (dangerStartedAtRef.current === null) {
        dangerStartedAtRef.current = now;
        lastDamageAtRef.current = now;
        setMessage("Dikkat! Kılıcı kullan, gölge çok yakında");
        return;
      }
      if (
        now - dangerStartedAtRef.current < 1200 ||
        now - lastDamageAtRef.current < 1200
      ) {
        return;
      }

      lastDamageAtRef.current = now;
      const nextHealth = Math.max(0, healthRef.current - CONTACT_DAMAGE);
      healthRef.current = nextHealth;
      setHealth(nextHealth);
      playSound("hurt");
      setMessage(`Dikkat! Canın ${nextHealth} oldu`);

      if (nextHealth === 0) {
        walkRef.current = null;
        playerRef.current = { ...START_POINT };
        cameraRef.current = { x: START_POINT.x, y: START_POINT.y, z: 0 };
        healthRef.current = MAX_HEALTH;
        dangerStartedAtRef.current = null;
        lastDamageAtRef.current = 0;
        dangerNearbyRef.current = false;
        setHealth(MAX_HEALTH);
        setDangerNearby(false);
        setIsWalking(false);
        setMessage("Mino dinlendi ve yeniden 100 canla hazır!");
      }
    }, 140);
    return () => window.clearInterval(timer);
  }, [playSound, started]);

  const handleArrival = useCallback(
    (point: Point, finalStep: boolean) => {
      const clearedAnimal = removeAnimalNear(point);
      const foundStar = collectAt(point);
      if (!finalStep || foundStar || clearedAnimal) return;
      if (!dangerNearbyRef.current) {
        setMessage("Dünya seninle birlikte kayıyor — keşfetmeye devam!");
      }
    },
    [collectAt, removeAnimalNear],
  );

  useEffect(() => {
    arrivalRef.current = handleArrival;
  }, [handleArrival]);

  const moveTo = useCallback(
    (point: Point) => {
      if (walkRef.current) {
        setMessage("Mino yürüyor...");
        return;
      }
      const start = playerRef.current;
      if (point.x < 0 || point.y < 0 || point.x >= WORLD_SIZE || point.y >= WORLD_SIZE) {
        playSound("oops");
        setMessage("Dünyanın içinde kalalım");
        return;
      }
      if (isSamePoint(start, point)) {
        arrivalRef.current(point, true);
        return;
      }
      const path = findWalkingPath(world, start, point);
      if (path.length === 0) {
        playSound("oops");
        setMessage("Oraya çıkmak için daha alçak bir yol seçelim");
        return;
      }
      const [next, ...remaining] = path;
      walkRef.current = {
        from: start,
        to: next,
        remaining,
        startedAt: performance.now(),
        duration: getWalkDuration(world, start, next),
      };
      setIsWalking(true);
      setMessage("Kamera Mino'yu ortada tutuyor");
      playSound("step");
    },
    [playSound, world],
  );

  useEffect(() => {
    if (!started) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        swingSword();
        return;
      }
      if (isWalking) return;
      const current = playerRef.current;
      const moves: Record<string, Point> = {
        ArrowUp: { x: current.x - 1, y: current.y },
        w: { x: current.x - 1, y: current.y },
        ArrowDown: { x: current.x + 1, y: current.y },
        s: { x: current.x + 1, y: current.y },
        ArrowLeft: { x: current.x, y: current.y + 1 },
        a: { x: current.x, y: current.y + 1 },
        ArrowRight: { x: current.x, y: current.y - 1 },
        d: { x: current.x, y: current.y - 1 },
      };
      const next = moves[event.key];
      if (!next) return;
      event.preventDefault();
      moveTo(next);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isWalking, moveTo, started, swingSword]);

  const findTile = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const pointX = event.clientX - bounds.left;
    const pointY = event.clientY - bounds.top;
    const metrics = getMetrics(bounds.width, bounds.height, cameraRef.current);
    const range = 24;
    const minX = Math.max(0, Math.floor(cameraRef.current.x) - range);
    const maxX = Math.min(WORLD_SIZE - 1, Math.ceil(cameraRef.current.x) + range);
    const minY = Math.max(0, Math.floor(cameraRef.current.y) - range);
    const maxY = Math.min(WORLD_SIZE - 1, Math.ceil(cameraRef.current.y) + range);
    let closest: { x: number; y: number; score: number; depth: number } | null = null;

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const columnHeight = world[y][x].length;
        if (columnHeight === 0) continue;
        const center = tileCenter(x, y, columnHeight, metrics);
        if (center.x < -metrics.tileW || center.x > bounds.width + metrics.tileW) continue;
        const score =
          Math.abs(pointX - center.x) / (metrics.tileW / 2) +
          Math.abs(pointY - center.y) / (metrics.tileH / 2);
        const depth = x + y + columnHeight * 0.03;
        if (
          score <= 1.3 &&
          (!closest ||
            score < closest.score - 0.08 ||
            (Math.abs(score - closest.score) <= 0.08 && depth > closest.depth))
        ) {
          closest = { x, y, score, depth };
        }
      }
    }
    return closest ? { x: closest.x, y: closest.y } : null;
  };

  const chooseTile = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!started) return;
    const point = findTile(event);
    if (!point) return;
    if (mode === "walk") {
      moveTo(point);
      return;
    }

    const animalSpot = animalsRef.current.some((animal) => {
      const target = animal.motion?.to;
      return isSamePoint(animal, point) || (target ? isSamePoint(target, point) : false);
    });
    const enemySpot = enemiesRef.current.some((enemy) => {
      const target = enemy.motion?.to;
      return isSamePoint(enemy, point) || (target ? isSamePoint(target, point) : false);
    });
    const protectedSpot =
      isSamePoint(playerRef.current, point) ||
      animalSpot ||
      enemySpot ||
      starsRef.current.some((star) => isSamePoint(star, point));
    if (protectedSpot) {
      setMessage("Mino, canlılar ve yıldızlar için burayı boş bırakalım");
      playSound("oops");
      return;
    }

    if (mode === "build") {
      if (world[point.y][point.x].length >= MAX_HEIGHT) {
        setMessage("Bu kule yeterince yüksek!");
        playSound("oops");
        return;
      }
      setWorld((current) => {
        const next = [...current];
        const nextRow = [...next[point.y]];
        nextRow[point.x] = [...nextRow[point.x], selectedBlock];
        next[point.y] = nextRow;
        return next;
      });
      setMessage("Süper bir blok!");
      playSound("build");
      return;
    }

    if (world[point.y][point.x].length <= 1) {
      setMessage("Dünyanın tabanı kalsın");
      playSound("oops");
      return;
    }
    setWorld((current) => {
      const next = [...current];
      const nextRow = [...next[point.y]];
      nextRow[point.x] = nextRow[point.x].slice(0, -1);
      next[point.y] = nextRow;
      return next;
    });
    setMessage("Blok kutuya geri döndü");
    playSound("remove");
  };

  const startGame = () => {
    setStarted(true);
    setMessage("Mino ortada kalır; dünya onun çevresinde hareket eder");
    playSound("start");
  };

  const resetGame = () => {
    const nextWorld = makeInitialWorld();
    const nextStars = makeInitialStars(nextWorld);
    walkRef.current = null;
    playerRef.current = { ...START_POINT };
    cameraRef.current = { x: START_POINT.x, y: START_POINT.y, z: 0 };
    starsRef.current = nextStars;
    starIdRef.current = nextStars.length;
    starCountRef.current = 0;
    animalsRef.current = makeAnimals();
    enemiesRef.current = makeEnemies(nextWorld);
    enemyIdRef.current = enemiesRef.current.length;
    dustRef.current = [];
    dustIdRef.current = 0;
    swordSwingStartedAtRef.current = -1000;
    dangerStartedAtRef.current = null;
    lastDamageAtRef.current = 0;
    dangerNearbyRef.current = false;
    healthRef.current = MAX_HEALTH;
    setWorld(nextWorld);
    setStars(nextStars);
    setStarCount(0);
    setHealth(MAX_HEALTH);
    setDangerNearby(false);
    setMode("walk");
    setSelectedBlock("grass");
    setIsWalking(false);
    setMessage("100 × 100 dünya yeniden hazır!");
    playSound("start");
  };

  const step = (direction: "northwest" | "northeast" | "southwest" | "southeast") => {
    const current = playerRef.current;
    const next = {
      northwest: { x: current.x - 1, y: current.y },
      northeast: { x: current.x, y: current.y - 1 },
      southwest: { x: current.x, y: current.y + 1 },
      southeast: { x: current.x + 1, y: current.y },
    }[direction];
    moveTo(next);
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setMessage("Tam ekran bu tarayıcıda açılamadı");
    }
  };

  return (
    <main className="game-shell">
      <section className="world-card" aria-label="Mineblok oyun alanı">
        <canvas
          ref={canvasRef}
          className={`world-canvas mode-${mode}${isWalking ? " is-walking" : ""}`}
          onPointerDown={chooseTile}
          aria-busy={isWalking}
          aria-label="Kameranın Mino'yu ortada tuttuğu büyük Mineblok dünyası"
        />

        <header className="scene-topbar">
          <div className="scene-brand">
            <span className="brand-cube" aria-hidden="true">▰</span>
            <h1>Mineblok</h1>
          </div>
          <div className="top-actions">
            <div
              className={`health-goal${dangerNearby ? " danger" : ""}`}
              aria-label={`${health} can kaldı`}
            >
              <span aria-hidden="true">❤️</span>
              <strong>{health}</strong>
            </div>
            <div className="star-goal" aria-label={`${starCount} yıldız toplandı`}>
              <span aria-hidden="true">⭐</span>
              <strong>{starCount}</strong>
            </div>
            <button
              type="button"
              className="mini-button"
              onClick={() => setSoundOn((current) => !current)}
              aria-label={soundOn ? "Sesi kapat" : "Sesi aç"}
              title={soundOn ? "Sesi kapat" : "Sesi aç"}
            >
              {soundOn ? "🔊" : "🔇"}
            </button>
            <button type="button" className="mini-button" onClick={resetGame} aria-label="Dünyayı yenile" title="Dünyayı yenile">↻</button>
            <button type="button" className="mini-button fullscreen-button" onClick={toggleFullscreen} aria-label="Tam ekran" title="Tam ekran">⛶</button>
          </div>
        </header>

        {!started && (
          <div className="welcome-card">
            <span className="welcome-sun" aria-hidden="true">🧭</span>
            <p>Uçsuz bucaksız Mineblok dünyası seni bekliyor!</p>
            <button type="button" className="play-button" onClick={startGame}>
              <span aria-hidden="true">▶</span> OYNA
            </button>
            <div className="safe-note" aria-label="Çocuklar için güvenlik özellikleri">
              <span>100 × 100 dünya</span><span>100 can</span><span>Reklam yok</span>
            </div>
          </div>
        )}

        {started && (
          <>
            <p className="sr-only" role="status" aria-live="polite">{message}</p>
            {mode === "walk" && (
              <div className="dpad" aria-label="Haritayla aynı yöndeki çapraz yürüme okları">
                <button type="button" className="dpad-northwest" onClick={() => step("northwest")} aria-label="Sol yukarı yürü" disabled={isWalking}>↖</button>
                <button type="button" className="dpad-northeast" onClick={() => step("northeast")} aria-label="Sağ yukarı yürü" disabled={isWalking}>↗</button>
                <button type="button" className="dpad-southwest" onClick={() => step("southwest")} aria-label="Sol aşağı yürü" disabled={isWalking}>↙</button>
                <button type="button" className="dpad-southeast" onClick={() => step("southeast")} aria-label="Sağ aşağı yürü" disabled={isWalking}>↘</button>
              </div>
            )}
            <button
              type="button"
              className={`sword-button${dangerNearby ? " danger" : ""}`}
              onClick={swingSword}
              aria-label="Kılıçla vur"
              title="Kılıçla vur (Boşluk tuşu)"
            >
              <span aria-hidden="true">⚔️</span>
              <strong>KILIÇ</strong>
              <small>BOŞLUK</small>
            </button>
          </>
        )}

        <nav className={`tool-dock ${started ? "is-ready" : ""}`} aria-label="Oyun araçları">
          {mode === "build" && started && (
            <div className="block-palette" aria-label="Blok renkleri">
              {BUILD_BLOCKS.map((block) => (
                <button
                  type="button"
                  key={block.kind}
                  className={selectedBlock === block.kind ? "palette-button selected" : "palette-button"}
                  onClick={() => { setSelectedBlock(block.kind); setMessage(`${block.label} bloğu seçildi`); }}
                  aria-label={`${block.label} bloğunu seç`}
                  title={block.label}
                >
                  <span className="palette-swatch" style={{ background: block.color }} aria-hidden="true">{block.emoji}</span>
                  <small>{block.label}</small>
                </button>
              ))}
            </div>
          )}
          <div className="mode-buttons">
            <button
              type="button"
              className={mode === "walk" ? "tool-button active" : "tool-button"}
              onClick={() => { setMode("walk"); setMessage("Gitmek istediğin yere dokun"); }}
              disabled={!started || isWalking}
            >
              <span aria-hidden="true">👣</span><strong>GEZ</strong>
            </button>
            <button
              type="button"
              className={mode === "build" ? "tool-button active" : "tool-button"}
              onClick={() => { setMode("build"); setMessage("Blok koymak için dünyaya dokun"); }}
              disabled={!started || isWalking}
            >
              <span className="block-icon" aria-hidden="true" /><strong>YAP</strong>
            </button>
            <button
              type="button"
              className={mode === "remove" ? "tool-button active remove" : "tool-button remove"}
              onClick={() => { setMode("remove"); setMessage("Geri almak istediğin bloğa dokun"); }}
              disabled={!started || isWalking}
            >
              <span aria-hidden="true">🧺</span><strong>GERİ AL</strong>
            </button>
          </div>
        </nav>

      </section>
    </main>
  );
}
