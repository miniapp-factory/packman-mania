"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

const GRID_SIZE = 10;
const CELL_SIZE = 32;

// Cell types
const WALL = 1;
const EMPTY = 0;
const PELLET = 2;
const POWER = 3;

// Directions
const DIRS = [
  { dx: 0, dy: -1 }, // up
  { dx: 1, dy: 0 },  // right
  { dx: 0, dy: 1 },  // down
  { dx: -1, dy: 0 }, // left
];

// Simple static maze layout
const MAZE_LAYOUT: number[][] = [
  [1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,1],
  [1,0,1,0,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,1,0,0,0,1],
  [1,0,1,1,0,1,1,1,0,1],
  [1,0,0,1,0,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1],
];

function cloneLayout(layout: number[][]) {
  return layout.map(row => [...row]);
}

export default function Game() {
  const [layout, setLayout] = useState<number[][]>(cloneLayout(MAZE_LAYOUT));
  const [playerPos, setPlayerPos] = useState({ x: 1, y: 1 });
  const [enemies, setEnemies] = useState([{ x: 8, y: 1 }]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [powerActive, setPowerActive] = useState(false);
  const [powerTimer, setPowerTimer] = useState(0);

  // Place pellets
  useEffect(() => {
    const newLayout = cloneLayout(MAZE_LAYOUT);
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (newLayout[y][x] === EMPTY) {
          newLayout[y][x] = Math.random() < 0.1 ? POWER : PELLET;
        }
      }
    }
    setLayout(newLayout);
  }, []);

  const movePlayer = useCallback(
    (dx: number, dy: number) => {
      if (gameOver) return;
      const newX = playerPos.x + dx;
      const newY = playerPos.y + dy;
      if (
        newX < 0 ||
        newX >= GRID_SIZE ||
        newY < 0 ||
        newY >= GRID_SIZE ||
        layout[newY][newX] === WALL
      )
        return;

      // Handle pellet consumption
      let newScore = score;
      if (layout[newY][newX] === PELLET) {
        newScore += 10;
      } else if (layout[newY][newX] === POWER) {
        newScore += 50;
        setPowerActive(true);
        setPowerTimer(5); // 5 seconds
      }

      const newLayout = cloneLayout(layout);
      newLayout[newY][newX] = EMPTY;
      setLayout(newLayout);
      setPlayerPos({ x: newX, y: newY });
      setScore(newScore);
    },
    [layout, playerPos, score, gameOver]
  );

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          movePlayer(0, -1);
          break;
        case "ArrowRight":
          movePlayer(1, 0);
          break;
        case "ArrowDown":
          movePlayer(0, 1);
          break;
        case "ArrowLeft":
          movePlayer(-1, 0);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [movePlayer]);

  // Enemy movement
  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setEnemies(prev =>
        prev.map(enemy => {
          const dir = DIRS[Math.floor(Math.random() * DIRS.length)];
          const nx = enemy.x + dir.dx;
          const ny = enemy.y + dir.dy;
          if (
            nx < 0 ||
            nx >= GRID_SIZE ||
            ny < 0 ||
            ny >= GRID_SIZE ||
            layout[ny][nx] === WALL
          ) {
            return enemy; // stay in place
          }
          return { x: nx, y: ny };
        })
      );
    }, 500);
    return () => clearInterval(interval);
  }, [layout, gameOver]);

  // Collision detection
  useEffect(() => {
    enemies.forEach(e => {
      if (e.x === playerPos.x && e.y === playerPos.y) {
        if (powerActive) {
          // Remove enemy
          setEnemies(prev => prev.filter(en => en !== e));
        } else {
          setGameOver(true);
        }
      }
    });
  }, [enemies, playerPos, powerActive]);

  // Power timer
  useEffect(() => {
    if (!powerActive) return;
    if (powerTimer <= 0) {
      setPowerActive(false);
      return;
    }
    const timer = setTimeout(() => setPowerTimer(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [powerTimer, powerActive]);

  const renderCell = (x: number, y: number) => {
    const cell = layout[y][x];
    const isPlayer = playerPos.x === x && playerPos.y === y;
    const enemy = enemies.find(e => e.x === x && e.y === y);
    return (
      <div
        key={`${x}-${y}`}
        className={cn(
          "w-[32px] h-[32px] flex items-center justify-center",
          cell === WALL && "bg-gray-800",
          cell === EMPTY && "bg-gray-900",
          cell === PELLET && "bg-yellow-400 rounded-full w-2 h-2",
          cell === POWER && "bg-yellow-400 rounded-full w-4 h-4",
          isPlayer && "bg-orange-500 rounded-full w-6 h-6 relative",
          enemy && "bg-red-600 rounded-full w-6 h-6"
        )}
      >
        {isPlayer && (
          <div className="absolute inset-0 bg-orange-500 rounded-full clip-path-mouth" />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">Maze Chase</h1>
      <div
        className="grid grid-cols-10 gap-0"
        style={{ width: `${GRID_SIZE * CELL_SIZE}px` }}
      >
        {Array.from({ length: GRID_SIZE }).flatMap((_, y) =>
          Array.from({ length: GRID_SIZE }).map((_, x) => renderCell(x, y))
        )}
      </div>
      <div className="flex gap-4">
        <span>Score: {score}</span>
        {gameOver && <span className="text-red-600">Game Over</span>}
      </div>
    </div>
  );
}
