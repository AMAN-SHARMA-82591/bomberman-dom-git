import { players, loseLife } from "../handlers/players.js";
import { gameState, checkGameEnd } from "../game/state.js";
import { broadcast } from "../handlers/connection.js";

export function handlePlaceBomb(playerId) {
  const player = players.get(playerId);
  if (!player || !player.alive) return;

  // Use player's current bomb count (no temp power-ups)
  const activeBombs = gameState.bombs.filter(
    (b) => b.ownerId === playerId
  ).length;

  if (activeBombs >= player.bombCount) {
    return;
  }

  // Prevent placing a bomb on a tile that already has one
  const isBombPresent = gameState.bombs.some(
    (b) =>
      b.position.x === player.position.x && b.position.y === player.position.y
  );
  if (isBombPresent) {
    return;
  }

  // Use player's current bomb range (no temp power-ups)
  const bomb = {
    id: crypto.randomUUID(),
    ownerId: playerId,
    position: { ...player.position },
    timer: 3000,
    range: player.bombRange, // Use direct range
  };

  gameState.bombs.push(bomb);
  broadcast({ type: "bombPlaced", bomb });

  // Schedule the explosion
  setTimeout(() => {
    explodeBomb(bomb.id);
  }, bomb.timer);
}

export function explodeBomb(bombId) {
  console.log("Exploding bomb:", bombId);
  const bombIndex = gameState.bombs.findIndex((b) => b.id === bombId);
  if (bombIndex === -1) return;

  const [bomb] = gameState.bombs.splice(bombIndex, 1);

  // Directions: center, right, left, down, up
  const directions = [
    { dx: 0, dy: 0 }, // center
    { dx: 1, dy: 0 }, // right
    { dx: -1, dy: 0 }, // left
    { dx: 0, dy: 1 }, // down
    { dx: 0, dy: -1 }, // up
  ];

  const explosionTiles = [];

  // Always add the center
  explosionTiles.push({
    x: bomb.position.x,
    y: bomb.position.y,
    dx: 0,
    dy: 0,
    distance: 0,
  });

  // For each direction (skip center)
  for (const { dx, dy } of directions.slice(1)) {
    for (let dist = 1; dist <= bomb.range; dist++) {
      const x = bomb.position.x + dx * dist;
      const y = bomb.position.y + dy * dist;

      if (
        y < 0 ||
        y >= gameState.map.height ||
        x < 0 ||
        x >= gameState.map.width
      )
        break;

      const tile = gameState.map.tiles[y][x];
      if (tile === "wall") break; // Stop at walls

      explosionTiles.push({
        x,
        y,
        dx,
        dy,
        distance: dist,
      });

      if (tile === "destructible-wall") {
        gameState.map.tiles[y][x] = "empty";
        // 30% chance to spawn power-up if any remaining
        if (Math.random() < 0.3) {
          const availableTypes = [];
          if (gameState.powerUpCounts.bomb > 0) availableTypes.push("bomb");
          if (gameState.powerUpCounts.flame > 0) availableTypes.push("flame");
          if (gameState.powerUpCounts.speed > 0) availableTypes.push("speed");

          if (availableTypes.length > 0) {
            const powerUpType =
              availableTypes[Math.floor(Math.random() * availableTypes.length)];
            gameState.map.powerUps.push({
              id: crypto.randomUUID(),
              type: powerUpType,
              x: x,
              y: y,
            });
            gameState.powerUpCounts[powerUpType]--;
          }
        }
        break; // Stop at destructible walls
      }
    }
  }

  // Check for players hit by the explosion
  const hitPlayers = [];
  for (const player of players.values()) {
    if (!player.alive || !player.position) continue;
    if (
      explosionTiles.some(
        (t) => t.x === player.position.x && t.y === player.position.y
      )
    ) {
      hitPlayers.push(player);
    }
  }

  for (const player of hitPlayers) {
    loseLife(player.id);
  }

  const updatedPlayers = hitPlayers.map((p) => players.get(p.id));


  const explosion = {
    id: crypto.randomUUID(),
    tiles: explosionTiles,
  };

  gameState.explosions.push(explosion);

  setTimeout(() => {
    const explosionIndex = gameState.explosions.findIndex(
      (e) => e.id === explosion.id
    );
    if (explosionIndex !== -1) {
      gameState.explosions.splice(explosionIndex, 1);
    }
  }, 700); // Same timing as client-side removal

  broadcast({
    type: "explosion",
    bombId: bomb.id,
    explosion,
    updatedMap: gameState.map,
    players: updatedPlayers,
  });

  checkGameEnd();
}
