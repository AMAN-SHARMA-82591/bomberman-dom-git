import { gameState, checkGameEnd } from './state.js';

const DEFAULT_TICKRATE = 60; // Default tick rate in frames per second (fps)
let intervalId = null;
let running = false;

export function startGameLoop({ tickRate = DEFAULT_TICKRATE } = {}) {
  if (running) return;
  running = true;
  const interval = 1000 / tickRate;

  intervalId = setInterval(() => {
    update(interval); // apply game logic
  }, interval);
}

export function stopGameLoop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  running = false;
}

// main game logic functionality here later on...
function update(interval = 1000 / DEFAULT_TICKRATE) {
  const dt = interval;        // ms per tick

  // process bombs: tick their timers, spawn explosion when expired
  const nextBombs = [];
  const spawnedExplosions = []; 

  for (const b of gameState.bombs) {
    const t = b.timer - dt;
    if (t <= 0) {
      // spawn explosion at center + 4 directions
      const dirs = [ [0,0], [1,0], [-1,0], [0,1], [0,-1] ];
      for (const [dx,dy] of dirs) {
        spawnedExplosions.push({
          x: b.x + dx,
          y: b.y + dy,
          timer: 2000       // explosion lives for 2s
        });
      }
    } else {
      nextBombs.push({ ...b, timer: t });
    }
  }

  // tick existing explosions and keep those still alive
  const nextExplosions = [];
  for (const ex of [...(gameState.explosions||[]), ...spawnedExplosions]) {
    const t = ex.timer - dt;
    if (t > 0) {
      nextExplosions.push({ x: ex.x, y: ex.y, timer: t });
    }
  }

  // build new state
  const next = {
    ...gameState,
    tick:       (gameState.tick ?? 0) + 1,
    bombs:      nextBombs,
    explosions: nextExplosions
  };

  gameState.tick = next.tick; // update game state tick
  gameState.bombs = nextBombs; // update bombs in game state
  gameState.explosions = nextExplosions; // update explosions in game state
  checkGameEnd(); // check if game has ended
}