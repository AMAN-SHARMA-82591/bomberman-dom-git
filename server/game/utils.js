import { gameState } from "./state.js";

export let count = 0;

export function updateCount(clear = null) {
  if (clear) {
    count = 0;
  } else {
    count++;
  }
}

export function isPositionValid({ x, y }) {
  if (!gameState.map.tiles) return false;
  // Check bounds
  if (y < 0 || y >= gameState.map.height || x < 0 || x >= gameState.map.width) {
    return false;
  }

  // Check for collisions with walls
  const tile = gameState.map.tiles[y][x];
  if (tile === "wall" || tile === "destructible-wall") {
    return false;
  }

  // // Check for collisions with bombs
  const isBombPresent = gameState.bombs.some(
    (b) => b.position.x === x && b.position.y === y
  );
  if (isBombPresent) {
    return false;
  }

  return true;
}