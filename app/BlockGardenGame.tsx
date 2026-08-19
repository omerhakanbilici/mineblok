"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const WORLD_SIZE = 9;
const MAX_HEIGHT = 5;

type Mode = "walk" | "build" | "remove";
type BlockKind = "dirt" | "grass" | "sand" | "pink" | "blue" | "flower";
type BuildBlock = Exclude<BlockKind, "dirt">;
type World = BlockKind[][][];
type Point = { x: number; y: number };
type Metrics = {
  centerX: number;
  topY: number;
  tileW: number;
  tileH: number;
  blockH: number;
};

const TERRAIN_HEIGHTS = [
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 2, 2, 1, 1, 1],
  [1, 1, 1, 2, 2, 2, 2, 1, 1],
  [1, 1, 2, 2, 2, 2, 1, 1, 1],
  [1, 1, 1, 2, 2, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 2, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 0, 0],
];

const STARS = [
  { id: "gunes", x: 1, y: 2 },
  { id: "bulut", x: 7, y: 2 },
  { id: "cicek", x: 6, y: 7 },
];

const ANIMALS = [
  { id: "koyun", kind: "sheep" as const, x: 6, y: 3, greeting: "Koyun: Mee!" },
  { id: "civciv", kind: "chick" as const, x: 2, y: 6, greeting: "Civciv: Cik cik!" },
];

const BUILD_BLOCKS: Array<{ kind: BuildBlock; label: string; color: string; emoji: string }> = [
  { kind: "grass", label: "Çimen", color: "#72c95b", emoji: "🌱" },
  { kind: "sand", label: "Kum", color: "#f1cf73", emoji: "☀" },
  { kind: "pink", label: "Pembe", color: "#f58aaa", emoji: "♥" },
  { kind: "blue", label: "Mavi", color: "#68b8e8", emoji: "●" },
  { kind: "flower", label: "Çiçek", color: "#75c95f", emoji: "🌼" },
];

const BLOCK_COLORS: Record<BlockKind, { top: string; left: string; right: string }> = {
  dirt: { top: "#ad7b50", left: "#8c5a39", right: "#71472f" },
  grass: { top: "#7bd161", left: "#9a6741", right: "#7d5035" },
  sand: { top: "#f8dd8d", left: "#d5ac5f", right: "#b9904e" },
  pink: { top: "#ff9eb9", left: "#db6f91", right: "#bd5579" },
  blue: { top: "#7ac9f2", left: "#4f9fd2", right: "#357fb7" },
  flower: { top: "#80d368", left: "#996741", right: "#7c5034" },
};

function makeInitialWorld(): World {
  return TERRAIN_HEIGHTS.map((row, y) =>
    row.map((height, x) => {
      if (height === 0) return [];
      const isBeach = height === 1 && (x <= 1 || y <= 1 || x >= 7 || y >= 7);
      return Array.from({ length: height }, (_, z) => {
        if (z < height - 1) return "dirt";
        return isBeach ? "sand" : "grass";
      });
    }),
  );
}

function polygon(
  context: CanvasRenderingContext2D,
  points: Array<[number, number]>,
  fill: string,
  stroke = "rgba(55, 66, 57, 0.10)",
) {
  context.beginPath();
  context.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index][0], points[index][1]);
  }
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 1;
  context.stroke();
}

function getMetrics(width: number, height: number): Metrics {
  const tileW = Math.min(76, Math.max(37, width / 11.5));
  return {
    centerX: width / 2,
    topY: Math.max(98, height * 0.18),
    tileW,
    tileH: tileW * 0.5,
    blockH: tileW * 0.34,
  };
}

function tileCenter(x: number, y: number, columnHeight: number, metrics: Metrics) {
  return {
    x: metrics.centerX + (x - y) * (metrics.tileW / 2),
    y:
      metrics.topY +
      (x + y) * (metrics.tileH / 2) -
      Math.max(0, columnHeight - 1) * metrics.blockH,
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
  const { tileW, tileH, blockH } = metrics;
  const center = tileCenter(x, y, z + 1, metrics);
  const halfW = tileW / 2;
  const halfH = tileH / 2;
  const colors = BLOCK_COLORS[kind];

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
  polygon(
    context,
    [
      [center.x - halfW, center.y],
      [center.x, center.y + halfH],
      [center.x, center.y + halfH + blockH],
      [center.x - halfW, center.y + blockH],
    ],
    colors.left,
  );
  polygon(
    context,
    [
      [center.x + halfW, center.y],
      [center.x, center.y + halfH],
      [center.x, center.y + halfH + blockH],
      [center.x + halfW, center.y + blockH],
    ],
    colors.right,
  );

  if (kind === "grass" || kind === "flower") {
    context.strokeStyle = "rgba(44, 113, 57, 0.34)";
    context.lineWidth = Math.max(1.5, tileW * 0.025);
    context.beginPath();
    context.moveTo(center.x - halfW * 0.72, center.y + blockH * 0.17);
    context.lineTo(center.x - halfW * 0.32, center.y + halfH * 0.42 + blockH * 0.17);
    context.moveTo(center.x + halfW * 0.72, center.y + blockH * 0.17);
    context.lineTo(center.x + halfW * 0.32, center.y + halfH * 0.42 + blockH * 0.17);
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
  const sway = Math.sin(time * 0.002 + x * 2) * 2;
  const baseY = center.y - metrics.tileH * 0.1;
  context.strokeStyle = "#3b8f4c";
  context.lineWidth = Math.max(2, metrics.tileW * 0.04);
  context.beginPath();
  context.moveTo(center.x, baseY);
  context.lineTo(center.x + sway, baseY - metrics.blockH * 0.65);
  context.stroke();
  const flowerY = baseY - metrics.blockH * 0.7;
  context.fillStyle = "#fff5f7";
  for (let petal = 0; petal < 5; petal += 1) {
    const angle = (petal / 5) * Math.PI * 2;
    context.beginPath();
    context.arc(center.x + sway + Math.cos(angle) * 5, flowerY + Math.sin(angle) * 5, 4.5, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "#f7bf3d";
  context.beginPath();
  context.arc(center.x + sway, flowerY, 4, 0, Math.PI * 2);
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
  const radius = metrics.tileW * (0.16 + Math.sin(time * 0.005 + x) * 0.012);
  const starY = center.y - metrics.blockH * 0.9 + Math.sin(time * 0.003 + y) * 4;

  context.fillStyle = "rgba(255, 213, 66, 0.18)";
  context.beginPath();
  context.arc(center.x, starY, radius * 1.9, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.translate(center.x, starY);
  context.rotate(time * 0.0008);
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
  context.strokeStyle = "#e7a930";
  context.lineWidth = 2;
  context.stroke();
  context.restore();
}

function drawPlayer(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  columnHeight: number,
  metrics: Metrics,
  time: number,
) {
  const center = tileCenter(x, y, columnHeight, metrics);
  const unit = metrics.tileW / 64;
  const bounce = Math.sin(time * 0.006) * 1.5;
  const baseY = center.y - 4 * unit + bounce;

  context.fillStyle = "rgba(38, 75, 56, 0.18)";
  context.beginPath();
  context.ellipse(center.x, center.y + metrics.tileH * 0.18, 13 * unit, 6 * unit, 0, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#3e8cc7";
  context.fillRect(center.x - 11 * unit, baseY - 29 * unit, 22 * unit, 24 * unit);
  context.fillStyle = "#2f679a";
  context.fillRect(center.x - 10 * unit, baseY - 7 * unit, 8 * unit, 12 * unit);
  context.fillRect(center.x + 2 * unit, baseY - 7 * unit, 8 * unit, 12 * unit);
  context.fillStyle = "#ffd2a5";
  context.fillRect(center.x - 14 * unit, baseY - 50 * unit, 28 * unit, 23 * unit);
  context.fillStyle = "#f6a847";
  context.fillRect(center.x - 16 * unit, baseY - 55 * unit, 32 * unit, 8 * unit);
  context.fillRect(center.x - 11 * unit, baseY - 61 * unit, 22 * unit, 8 * unit);
  context.fillStyle = "#2d3a34";
  context.fillRect(center.x - 8 * unit, baseY - 43 * unit, 4 * unit, 4 * unit);
  context.fillRect(center.x + 5 * unit, baseY - 43 * unit, 4 * unit, 4 * unit);
  context.fillStyle = "#e98973";
  context.fillRect(center.x - 2 * unit, baseY - 35 * unit, 7 * unit, 3 * unit);
}

function drawAnimal(
  context: CanvasRenderingContext2D,
  kind: "sheep" | "chick",
  x: number,
  y: number,
  columnHeight: number,
  metrics: Metrics,
  time: number,
) {
  const center = tileCenter(x, y, columnHeight, metrics);
  const unit = metrics.tileW / 64;
  const bounce = Math.sin(time * 0.004 + x + y) * 1.6;
  const baseY = center.y - 2 * unit + bounce;

  context.fillStyle = "rgba(38, 75, 56, 0.14)";
  context.beginPath();
  context.ellipse(center.x, center.y + metrics.tileH * 0.12, 12 * unit, 5 * unit, 0, 0, Math.PI * 2);
  context.fill();

  if (kind === "sheep") {
    context.fillStyle = "#fffdf5";
    context.fillRect(center.x - 17 * unit, baseY - 25 * unit, 28 * unit, 19 * unit);
    context.fillStyle = "#d7c2a7";
    context.fillRect(center.x + 7 * unit, baseY - 29 * unit, 16 * unit, 16 * unit);
    context.fillStyle = "#493f38";
    context.fillRect(center.x + 17 * unit, baseY - 24 * unit, 3 * unit, 3 * unit);
    context.fillStyle = "#8d765e";
    context.fillRect(center.x - 12 * unit, baseY - 8 * unit, 4 * unit, 9 * unit);
    context.fillRect(center.x + 5 * unit, baseY - 8 * unit, 4 * unit, 9 * unit);
  } else {
    context.fillStyle = "#ffd94f";
    context.beginPath();
    context.arc(center.x, baseY - 15 * unit, 12 * unit, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#f49a3f";
    polygon(
      context,
      [
        [center.x + 9 * unit, baseY - 16 * unit],
        [center.x + 17 * unit, baseY - 12 * unit],
        [center.x + 9 * unit, baseY - 9 * unit],
      ],
      "#f49a3f",
      "transparent",
    );
    context.fillStyle = "#3a3934";
    context.beginPath();
    context.arc(center.x + 4 * unit, baseY - 19 * unit, 2 * unit, 0, Math.PI * 2);
    context.fill();
  }
}

function drawCloud(context: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  context.fillStyle = "rgba(255, 255, 255, 0.78)";
  context.beginPath();
  context.ellipse(x, y, 42 * scale, 15 * scale, 0, 0, Math.PI * 2);
  context.ellipse(x + 34 * scale, y - 6 * scale, 31 * scale, 22 * scale, 0, 0, Math.PI * 2);
  context.ellipse(x + 69 * scale, y, 42 * scale, 15 * scale, 0, 0, Math.PI * 2);
  context.fill();
}

function isSamePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y;
}

export default function BlockGardenGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>("walk");
  const [selectedBlock, setSelectedBlock] = useState<BuildBlock>("grass");
  const [world, setWorld] = useState<World>(() => makeInitialWorld());
  const [player, setPlayer] = useState<Point>({ x: 4, y: 4 });
  const [collectedStars, setCollectedStars] = useState<string[]>([]);
  const [message, setMessage] = useState("Gitmek istediğin yere dokun");
  const [soundOn, setSoundOn] = useState(true);
  const [celebrating, setCelebrating] = useState(false);

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
        gain.gain.exponentialRampToValueAtTime(kind === "step" ? 0.035 : 0.075, begins + 0.015);
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
      const metrics = getMetrics(width, height);
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const time = reducedMotion ? 0 : rawTime;

      const sky = context.createLinearGradient(0, 0, 0, height);
      sky.addColorStop(0, "#7fd3ff");
      sky.addColorStop(0.62, "#d9f6ff");
      sky.addColorStop(1, "#fff0bf");
      context.fillStyle = sky;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(255, 222, 89, 0.9)";
      context.beginPath();
      context.arc(width * 0.83, height * 0.17, Math.min(42, width * 0.065), 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "rgba(255, 255, 255, 0.2)";
      context.beginPath();
      context.arc(width * 0.83, height * 0.17, Math.min(62, width * 0.09), 0, Math.PI * 2);
      context.fill();

      const cloudShift = (time * 0.008) % (width + 240);
      drawCloud(context, -130 + cloudShift, height * 0.16, 0.8);
      drawCloud(context, width - ((cloudShift * 0.55 + 160) % (width + 220)), height * 0.27, 0.58);

      context.fillStyle = "rgba(88, 185, 198, 0.28)";
      context.beginPath();
      context.ellipse(width / 2, height * 0.79, Math.min(width * 0.42, 420), height * 0.115, 0, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = "rgba(255, 255, 255, 0.48)";
      context.lineWidth = 2;
      for (let wave = 0; wave < 5; wave += 1) {
        const waveY = height * 0.73 + wave * 14;
        context.beginPath();
        context.arc(width * (0.23 + wave * 0.11), waveY, 18, Math.PI * 0.1, Math.PI * 0.9);
        context.stroke();
      }

      for (let diagonal = 0; diagonal <= (WORLD_SIZE - 1) * 2; diagonal += 1) {
        for (let x = 0; x < WORLD_SIZE; x += 1) {
          const y = diagonal - x;
          if (y < 0 || y >= WORLD_SIZE) continue;
          const column = world[y][x];
          if (column.length === 0) continue;

          column.forEach((kind, z) => drawBlock(context, x, y, z, kind, metrics));
          if (column.at(-1) === "flower") drawFlower(context, x, y, column.length, metrics, time);

          const star = STARS.find(
            (candidate) =>
              candidate.x === x && candidate.y === y && !collectedStars.includes(candidate.id),
          );
          if (star) drawStar(context, x, y, column.length, metrics, time);

          const animal = ANIMALS.find((candidate) => candidate.x === x && candidate.y === y);
          if (animal) drawAnimal(context, animal.kind, x, y, column.length, metrics, time);

          if (player.x === x && player.y === y) {
            drawPlayer(context, x, y, column.length, metrics, time);
          }
        }
      }

      if (celebrating) {
        const colors = ["#ff785d", "#ffd84e", "#68b8e8", "#7bd161", "#f58aaa"];
        for (let index = 0; index < 54; index += 1) {
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
    [celebrating, collectedStars, player, world],
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
      if (!star || collectedStars.includes(star.id)) return false;
      const nextCount = collectedStars.length + 1;
      setCollectedStars((current) => [...current, star.id]);
      playSound("star");
      if (nextCount === STARS.length) {
        setMessage("Harika! Bütün yıldızları buldun!");
        window.setTimeout(() => setCelebrating(true), 320);
      } else {
        setMessage(`Yaşasın! ${nextCount}. yıldızı buldun!`);
      }
      return true;
    },
    [collectedStars, playSound],
  );

  const moveTo = useCallback(
    (point: Point) => {
      if (point.x < 0 || point.y < 0 || point.x >= WORLD_SIZE || point.y >= WORLD_SIZE) {
        playSound("oops");
        setMessage("Adanın içinde kalalım");
        return;
      }
      if (world[point.y][point.x].length === 0) {
        playSound("oops");
        setMessage("Orası su! Başka bir yere gidelim");
        return;
      }
      setPlayer(point);
      playSound("step");
      const foundStar = collectAt(point);
      if (foundStar) return;
      const animal = ANIMALS.find((candidate) => isSamePoint(candidate, point));
      if (animal) {
        setMessage(animal.greeting);
        playSound("hello");
      } else {
        setMessage("Gezmeye devam et, yıldızlar parlıyor!");
      }
    },
    [collectAt, playSound, world],
  );

  useEffect(() => {
    if (!started || celebrating) return;
    const handleKey = (event: KeyboardEvent) => {
      const moves: Record<string, Point> = {
        ArrowUp: { x: player.x - 1, y: player.y },
        w: { x: player.x - 1, y: player.y },
        ArrowDown: { x: player.x + 1, y: player.y },
        s: { x: player.x + 1, y: player.y },
        ArrowLeft: { x: player.x, y: player.y + 1 },
        a: { x: player.x, y: player.y + 1 },
        ArrowRight: { x: player.x, y: player.y - 1 },
        d: { x: player.x, y: player.y - 1 },
      };
      const next = moves[event.key];
      if (!next) return;
      event.preventDefault();
      moveTo(next);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [celebrating, moveTo, player, started]);

  const findTile = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const bounds = canvas.getBoundingClientRect();
    const pointX = event.clientX - bounds.left;
    const pointY = event.clientY - bounds.top;
    const metrics = getMetrics(bounds.width, bounds.height);
    let closest: { x: number; y: number; score: number; depth: number } | null = null;

    for (let y = 0; y < WORLD_SIZE; y += 1) {
      for (let x = 0; x < WORLD_SIZE; x += 1) {
        const columnHeight = world[y][x].length;
        if (columnHeight === 0) continue;
        const center = tileCenter(x, y, columnHeight, metrics);
        const score =
          Math.abs(pointX - center.x) / (metrics.tileW / 2) +
          Math.abs(pointY - center.y) / (metrics.tileH / 2);
        const depth = x + y + columnHeight * 0.02;
        if (
          score <= 1.32 &&
          (!closest || score < closest.score - 0.08 || (Math.abs(score - closest.score) <= 0.08 && depth > closest.depth))
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

    const protectedSpot =
      isSamePoint(player, point) ||
      ANIMALS.some((animal) => isSamePoint(animal, point)) ||
      STARS.some((star) => isSamePoint(star, point) && !collectedStars.includes(star.id));
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
      setWorld((current) =>
        current.map((row, y) =>
          row.map((column, x) =>
            x === point.x && y === point.y ? [...column, selectedBlock] : column,
          ),
        ),
      );
      setMessage("Süper bir blok!");
      playSound("build");
      return;
    }

    if (world[point.y][point.x].length <= 1) {
      setMessage("Adanın tabanı kalsın");
      playSound("oops");
      return;
    }
    setWorld((current) =>
      current.map((row, y) =>
        row.map((column, x) => (x === point.x && y === point.y ? column.slice(0, -1) : column)),
      ),
    );
    setMessage("Blok kutuya geri döndü");
    playSound("remove");
  };

  const startGame = () => {
    setStarted(true);
    setMessage("Mino'yu yıldızlara götür!");
    playSound("start");
  };

  const resetGame = () => {
    setWorld(makeInitialWorld());
    setPlayer({ x: 4, y: 4 });
    setCollectedStars([]);
    setMode("walk");
    setSelectedBlock("grass");
    setCelebrating(false);
    setMessage("Yeni ada hazır!");
    playSound("start");
  };

  const step = (direction: "up" | "down" | "left" | "right") => {
    const next = {
      up: { x: player.x - 1, y: player.y },
      down: { x: player.x + 1, y: player.y },
      left: { x: player.x, y: player.y + 1 },
      right: { x: player.x, y: player.y - 1 },
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
      <header className="topbar">
        <div className="brand">
          <span className="brand-cube" aria-hidden="true">▰</span>
          <div>
            <p className="eyebrow">Minik kaşifler için</p>
            <h1>Blok Bahçesi</h1>
          </div>
        </div>
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
          <button type="button" className="mini-button" onClick={resetGame} aria-label="Adayı yenile" title="Adayı yenile">
            ↻
          </button>
          <button type="button" className="mini-button fullscreen-button" onClick={toggleFullscreen} aria-label="Tam ekran" title="Tam ekran">
            ⛶
          </button>
        </div>
      </header>

      <section className="world-card" aria-label="Blok Bahçesi oyun alanı">
        <canvas
          ref={canvasRef}
          className={`world-canvas mode-${mode}`}
          onPointerDown={chooseTile}
          aria-label="Dokunarak gezebileceğin, yıldız toplayabileceğin ve blok yapabileceğin ada"
        />

        {!started && (
          <div className="welcome-card">
            <span className="welcome-sun" aria-hidden="true">☀️</span>
            <p>Mino ile 3 yıldızı bul, sonra hayalindeki adayı yap!</p>
            <button type="button" className="play-button" onClick={startGame}>
              <span aria-hidden="true">▶</span> OYNA
            </button>
            <div className="safe-note" aria-label="Çocuklar için güvenlik özellikleri">
              <span>Reklam yok</span><span>Sohbet yok</span><span>Kaybetmek yok</span>
            </div>
          </div>
        )}

        {started && !celebrating && (
          <>
            <div className="hint-bubble" role="status" aria-live="polite">{message}</div>
            {mode === "walk" && (
              <div className="dpad" aria-label="Yürüme okları">
                <button type="button" className="dpad-up" onClick={() => step("up")} aria-label="Yukarı yürü">▲</button>
                <button type="button" className="dpad-left" onClick={() => step("left")} aria-label="Sola yürü">◀</button>
                <button type="button" className="dpad-right" onClick={() => step("right")} aria-label="Sağa yürü">▶</button>
                <button type="button" className="dpad-down" onClick={() => step("down")} aria-label="Aşağı yürü">▼</button>
              </div>
            )}
          </>
        )}

        {celebrating && (
          <div className="celebration-card" role="dialog" aria-label="Tebrikler">
            <span className="rainbow" aria-hidden="true">🌈</span>
            <h2>Başardın!</h2>
            <p>Bütün yıldızları buldun. Şimdi adanı istediğin gibi yapabilirsin!</p>
            <div className="celebration-actions">
              <button type="button" className="continue-button" onClick={() => { setCelebrating(false); setMode("build"); setMessage("Şimdi hayalindeki adayı yap!"); }}>
                BLOK YAP
              </button>
              <button type="button" className="again-button" onClick={resetGame}>YENİDEN</button>
            </div>
          </div>
        )}
      </section>

      <nav className={`tool-dock ${started ? "is-ready" : ""}`} aria-label="Oyun araçları">
        <div className="mode-buttons">
          <button
            type="button"
            className={mode === "walk" ? "tool-button active" : "tool-button"}
            onClick={() => { setMode("walk"); setMessage("Gitmek istediğin yere dokun"); }}
            disabled={!started}
          >
            <span aria-hidden="true">👣</span><strong>GEZ</strong>
          </button>
          <button
            type="button"
            className={mode === "build" ? "tool-button active" : "tool-button"}
            onClick={() => { setMode("build"); setMessage("Blok koymak için adaya dokun"); }}
            disabled={!started}
          >
            <span className="block-icon" aria-hidden="true" /><strong>YAP</strong>
          </button>
          <button
            type="button"
            className={mode === "remove" ? "tool-button active remove" : "tool-button remove"}
            onClick={() => { setMode("remove"); setMessage("Geri almak istediğin bloğa dokun"); }}
            disabled={!started}
          >
            <span aria-hidden="true">🧺</span><strong>GERİ AL</strong>
          </button>
        </div>

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
      </nav>
    </main>
  );
}
