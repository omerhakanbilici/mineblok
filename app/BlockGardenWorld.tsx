"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WORLD_SIZE = 100;
const MAX_HEIGHT = 6;
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
type AnimalKind = "sheep" | "chick";
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

const STARS = [
  { id: "gunes", x: 46, y: 48 },
  { id: "bulut", x: 56, y: 47 },
  { id: "cicek", x: 54, y: 57 },
];

const ANIMAL_SPAWNS = [
  { id: "koyun-1", kind: "sheep" as const, x: 53, y: 49, greeting: "Koyun: Mee!" },
  { id: "koyun-2", kind: "sheep" as const, x: 47, y: 53, greeting: "Koyun: Mee!" },
  { id: "koyun-3", kind: "sheep" as const, x: 57, y: 55, greeting: "Koyun: Mee!" },
  { id: "civciv", kind: "chick" as const, x: 49, y: 46, greeting: "Civciv: Cik cik!" },
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
  [START_POINT, ...STARS, ...ANIMAL_SPAWNS].map((point) => `${point.x},${point.y}`),
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

function drawVoxelPlayer(
  context: CanvasRenderingContext2D,
  center: ScreenPoint,
  metrics: Metrics,
  time: number,
  walking: boolean,
) {
  const unit = metrics.tileW / 105;
  const phase = walking ? Math.sin(time * 0.02) : 0;
  const bounce = walking ? Math.abs(Math.sin(time * 0.02)) * 2.2 * unit : 0;
  const surfaceY = center.y + metrics.tileH * 0.03;
  const groundY = surfaceY - bounce;

  context.fillStyle = "rgba(21, 47, 32, 0.26)";
  context.beginPath();
  context.ellipse(center.x + 4 * unit, surfaceY + 3 * unit, 18 * unit, 5 * unit, 0, 0, Math.PI * 2);
  context.fill();

  const shoeHeight = 7 * unit;
  const leftShoeBottom = groundY - Math.max(0, phase) * 3 * unit;
  const rightShoeBottom = groundY - Math.max(0, -phase) * 3 * unit;
  const leftLegBottom = leftShoeBottom - shoeHeight;
  const rightLegBottom = rightShoeBottom - shoeHeight;
  drawCuboid(context, center.x - 8 * unit + phase * 3 * unit, leftLegBottom, 12 * unit, 31 * unit, 4 * unit, {
    front: "#315f9f",
    side: "#21497e",
    top: "#4779b7",
  });
  drawCuboid(context, center.x + 8 * unit - phase * 3 * unit, rightLegBottom, 12 * unit, 31 * unit, 4 * unit, {
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

  const bodyBottom = groundY - 29 * unit;
  drawCuboid(context, center.x, bodyBottom, 29 * unit, 39 * unit, 7 * unit, {
    front: "#3c9ea5",
    side: "#25747d",
    top: "#62bbc0",
  });
  drawCuboid(context, center.x - 21 * unit - phase * 3 * unit, bodyBottom - 2 * unit, 9 * unit, 36 * unit, 3 * unit, {
    front: "#d9a06d",
    side: "#aa724a",
    top: "#efbd8b",
  });
  drawCuboid(context, center.x + 21 * unit + phase * 3 * unit, bodyBottom - 2 * unit, 9 * unit, 36 * unit, 3 * unit, {
    front: "#d9a06d",
    side: "#aa724a",
    top: "#efbd8b",
  });

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
  } else {
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
  }
}

function isSamePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

function isWalkable(world: World, from: Point, to: Point) {
  if (to.x < 0 || to.y < 0 || to.x >= WORLD_SIZE || to.y >= WORLD_SIZE) return false;
  const fromHeight = world[from.y][from.x].length;
  const toHeight = world[to.y][to.x].length;
  return toHeight > 0 && Math.abs(toHeight - fromHeight) <= 1;
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

export default function BlockGardenWorld() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const playerRef = useRef<Point>({ ...START_POINT });
  const cameraRef = useRef<WorldPosition>({ x: START_POINT.x, y: START_POINT.y, z: 0 });
  const walkRef = useRef<WalkMotion | null>(null);
  const arrivalRef = useRef<(point: Point, finalStep: boolean) => void>(() => undefined);
  const collectedStarsRef = useRef<string[]>([]);
  const animalsRef = useRef<AnimalState[]>(makeAnimals());
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>("walk");
  const [selectedBlock, setSelectedBlock] = useState<BuildBlock>("grass");
  const [world, setWorld] = useState<World>(() => makeInitialWorld());
  const [collectedStars, setCollectedStars] = useState<string[]>([]);
  const [message, setMessage] = useState("Gitmek istediğin yere dokun");
  const [soundOn, setSoundOn] = useState(true);
  const [celebrating, setCelebrating] = useState(false);
  const [isWalking, setIsWalking] = useState(false);

  const playSound = useCallback(
    (kind: "start" | "step" | "build" | "remove" | "star" | "hello" | "oops") => {
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
      };
      notes[kind].forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const begins = audio.currentTime + index * 0.085;
        oscillator.type = kind === "remove" || kind === "oops" ? "triangle" : "sine";
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

      let playerWorld: WorldPosition = {
        x: playerRef.current.x,
        y: playerRef.current.y,
        z: Math.max(0, world[playerRef.current.y][playerRef.current.x].length - 1),
      };
      let playerMoving = false;
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
              duration: activeMotion.duration,
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
          playerMoving = true;
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

      for (const star of STARS) {
        if (collectedStars.includes(star.id)) continue;
        const column = world[star.y][star.x];
        if (column.length === 0) continue;
        const center = tileCenter(star.x, star.y, column.length, metrics);
        if (center.x > -80 && center.x < width + 80 && center.y > -80 && center.y < height + 80) {
          drawStar(context, star.x, star.y, column.length, metrics, time);
        }
      }

      for (const animal of animalsRef.current) {
        const rendered = updateAnimal(animal, world, rawTime, started && !celebrating);
        const center = tileCenter(rendered.x, rendered.y, rendered.z + 1, metrics);
        if (center.x > -120 && center.x < width + 120 && center.y > -120 && center.y < height + 120) {
          drawVoxelAnimal(context, animal.kind, center, metrics, time, rendered.moving);
        }
      }

      const playerCenter = tileCenter(playerWorld.x, playerWorld.y, playerWorld.z + 1, metrics);
      drawVoxelPlayer(context, playerCenter, metrics, time, playerMoving);

      if (celebrating) {
        const colors = ["#ff785d", "#ffd84e", "#68b8e8", "#7bd161", "#f58aaa"];
        for (let index = 0; index < 56; index += 1) {
          const seed = index * 37.19;
          const x = ((seed * 17 + time * (0.025 + (index % 5) * 0.006)) % (width + 30)) - 15;
          const y = ((seed * 11 + time * (0.045 + (index % 4) * 0.008)) % (height + 50)) - 25;
          context.save();
          context.translate(x, y);
          context.rotate(time * 0.003 + seed);
          context.fillStyle = colors[index % colors.length];
          context.fillRect(-4, -7, 8, 14);
          context.restore();
        }
      }
    },
    [celebrating, collectedStars, playSound, started, world],
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

  const collectAt = useCallback(
    (point: Point) => {
      const star = STARS.find((candidate) => isSamePoint(candidate, point));
      if (!star || collectedStarsRef.current.includes(star.id)) return false;
      const nextStars = [...collectedStarsRef.current, star.id];
      collectedStarsRef.current = nextStars;
      setCollectedStars(nextStars);
      playSound("star");
      if (nextStars.length === STARS.length) {
        setMessage("Harika! Bütün yıldızları buldun!");
        window.setTimeout(() => setCelebrating(true), 320);
      } else {
        setMessage(`Yaşasın! ${nextStars.length}. yıldızı buldun!`);
      }
      return true;
    },
    [playSound],
  );

  const handleArrival = useCallback(
    (point: Point, finalStep: boolean) => {
      const foundStar = collectAt(point);
      if (!finalStep || foundStar) return;
      const animal = animalsRef.current.find(
        (candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < 0.9,
      );
      if (animal) {
        setMessage(animal.greeting);
        playSound("hello");
      } else {
        setMessage("Dünya seninle birlikte kayıyor — keşfetmeye devam!");
      }
    },
    [collectAt, playSound],
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
        duration: 270,
      };
      setIsWalking(true);
      setMessage("Kamera Mino'yu ortada tutuyor");
      playSound("step");
    },
    [playSound, world],
  );

  useEffect(() => {
    if (!started || celebrating || isWalking) return;
    const handleKey = (event: KeyboardEvent) => {
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
  }, [celebrating, isWalking, moveTo, started]);

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
    if (!started || celebrating) return;
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
    const protectedSpot =
      isSamePoint(playerRef.current, point) ||
      animalSpot ||
      STARS.some((star) => isSamePoint(star, point) && !collectedStarsRef.current.includes(star.id));
    if (protectedSpot) {
      setMessage("Mino, hayvanlar ve yıldızlar için burayı boş bırakalım");
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
    walkRef.current = null;
    playerRef.current = { ...START_POINT };
    cameraRef.current = { x: START_POINT.x, y: START_POINT.y, z: 0 };
    collectedStarsRef.current = [];
    animalsRef.current = makeAnimals();
    setWorld(makeInitialWorld());
    setCollectedStars([]);
    setMode("walk");
    setSelectedBlock("grass");
    setCelebrating(false);
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
          <div className="top-actions">
            <div className="star-goal" aria-label={`${collectedStars.length} yıldız bulundu, hedef 3`}>
              <span aria-hidden="true">⭐</span>
              <strong>{collectedStars.length} / {STARS.length}</strong>
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
          <div className="scene-brand">
            <span className="brand-cube" aria-hidden="true">▰</span>
            <h1>Mineblok</h1>
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
              <span>100 × 100 dünya</span><span>Reklam yok</span><span>Kaybetmek yok</span>
            </div>
          </div>
        )}

        {started && !celebrating && (
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

        {celebrating && (
          <div className="celebration-card" role="dialog" aria-label="Tebrikler">
            <span className="rainbow" aria-hidden="true">🌈</span>
            <h2>Başardın!</h2>
            <p>Bütün yıldızları buldun. Şimdi dev dünyanı istediğin gibi yapabilirsin!</p>
            <div className="celebration-actions">
              <button type="button" className="continue-button" onClick={() => { setCelebrating(false); setMode("build"); setMessage("Şimdi hayalindeki dünyayı yap!"); }}>BLOK YAP</button>
              <button type="button" className="again-button" onClick={resetGame}>YENİDEN</button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
