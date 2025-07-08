// generating the game map 
// by placing walls, destructible walls, and spawn points
// in a 2D grid format
export function generateGameMap() {
  const tiles = [];
  const width = 15;
  const height = 13;

  for (let row = 0; row < height; row++) {
    tiles[row] = [];
    for (let col = 0; col < width; col++) {
      // The order of these checks is important.
      // 1. Set outer walls.
      if (row === 0 || row === height - 1 || col === 0 || col === width - 1) {
        tiles[row][col] = "wall";
        // 2. Clear spawn corners. This must happen before pillar or destructible walls are placed.
        // 3. Set inner "pillar" walls.
      } else if (row % 2 === 0 && col % 2 === 0) {
        tiles[row][col] = "wall";
        // 4. Place random destructible walls.
      } else if (
        Math.random() < 0.5 &&
        !(
          // Top-left
          (
            (row === 1 && col === 1) ||
            (row === 1 && col === 2) ||
            (row === 2 && col === 1) ||
            // Top-right
            (row === 1 && col === 13) ||
            (row === 1 && col === 12) ||
            (row === 2 && col === 13) ||
            // Bottom-left
            (row === 11 && col === 1) ||
            (row === 11 && col === 2) ||
            (row === 10 && col === 1) ||
            // Bottom-right
            (row === 11 && col === 13) ||
            (row === 11 && col === 12) ||
            (row === 10 && col === 13)
          )
        )
      ) {
        tiles[row][col] = "destructible-wall";
        // 5. Fill the rest with empty space.
      } else {
        tiles[row][col] = "empty";
      }
    }
  }
  return {
    width,
    height,
    tiles,
    powerUps: [],
  };
}