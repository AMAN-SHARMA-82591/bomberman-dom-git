import { broadcast, sendMsg } from "./connection.js";
import { gameState } from "../game/state.js";
import { isPositionValid } from "../game/utils.js";

export const players = new Map();
export const playerPositions = [];

// adding a player to the game
export function addPlayer(client) {
  if (
    players.has(client.id) ||
    players.size > 4 ||
    gameState.status !== "countdown"
  )
    return; // Prevent re-adding and limit to 4 players

  const positionIndex = players.size;
  const position = playerPositions[positionIndex];

  players.set(client.id, { // creating a player object with default values
    id: client.id,
    nickname: client.nickname,
    avatar: "player" + (positionIndex + 1), // Assign an avatar based on position
    lives: 3,
    alive: true,
    position: { ...position },
    speed: 0.5,
    bombRange: 1,
    bombCount: 1,
    tempPowerUps: [],
  });
}

// removing a player from the game based on their ID
export function removePlayer(id) {
  players.delete(id);
}

// Deactivate a player when they leave the game or are eliminated
export function deactivatePlayer(id) {
  const player = players.get(id);
  if (!player) return;
  player.alive = false;
  player.immune = false;
  player.position = null;
  player.lives = 0;
  broadcast({
      type: "playerEliminated",
      id: player.id,
      nickname: player.nickname,
      lives: 0,
      alive: false,
      speed: player.speed,
      bombCount: player.bombCount,
      bombRange: player.bombRange,
    });
}

// Lose a life for a player, handle short immunity and position reset
export function loseLife(id) {
  console.log("loseLife called for player:", id);
  const player = players.get(id);
  if (!player || player.immune) return; // Ignore if player is already immune

  player.lives--;
  player.immune = true; // <-- Set player to immune
  if (player.lives <= 0) { 
    deactivatePlayer(id);
  } else {
    sendPlayerUpdate(player);

    // Disable movement for 1 second, then reset position
    setTimeout(() => {
      const startPositions = getPlayerPositions(gameState.map.width, gameState.map.height);
      const playerIndex = Array.from(players.keys()).indexOf(id);
      if (startPositions[playerIndex]) {
        player.position = { ...startPositions[playerIndex] };
      }
      sendPlayerUpdate(player, player.position); // Send updated position to all clients
    }, 1000); // 1 second delay
  }
  // 2 seconds: remove immunity
  setTimeout(() => {
    player.immune = false;
    sendPlayerUpdate(player); // Send update to all clients
  }, 2000); // 2 seconds immunity
}

export function getPlayerState(id) {
  return players.get(id);
}

export function updatePlayerPosition(id, position) {
  if (players.has(id)) {
    players.get(id).position = position;
    return true; // Add return value
  }
  return false;
}

// Add movement cooldown tracking
const playerMoveCooldowns = new Map();

export function handlePlayerMove(id, direction) {
  const player = players.get(id);
  if (!player || !player.alive) return;

  // Check movement cooldown based on player speed
  const now = Date.now();
  const lastMoveTime = playerMoveCooldowns.get(id) || 0;
  const baseCooldown = 100;
  const speedCooldown = baseCooldown / player.speed; // Faster = shorter cooldown

  if (now - lastMoveTime < speedCooldown) {
    return; // Still in cooldown, ignore move request
  }

  const { position } = player;
  const newPosition = { ...position };

  switch (direction) {
    case "up":
      newPosition.y -= 1;
      break;
    case "down":
      newPosition.y += 1;
      break;
    case "left":
      newPosition.x -= 1;
      break;
    case "right":
      newPosition.x += 1;
      break;
    default:
      return; // Invalid direction
  }

  if (isPositionValid(newPosition)) {
    const oldPosition = player.position;
    player.position = newPosition;
    playerMoveCooldowns.set(id, now); // Update last move time

    // Check if player walked into active explosion
    const inExplosion = gameState.explosions.some((explosion) =>
      explosion.tiles.some(
        (tile) => tile.x === newPosition.x && tile.y === newPosition.y
      )
    );

    if (inExplosion) {
      loseLife(player.id);
    }

    // Check for power-up pickup
    const powerUpIndex = gameState.map.powerUps.findIndex(
      (p) => p.x === newPosition.x && p.y === newPosition.y
    );

    if (powerUpIndex !== -1) {
      const powerUp = gameState.map.powerUps[powerUpIndex];

      if (powerUp.type === "bomb") {
        // Permanent bomb count increase
        player.bombCount += 1;
      } else if (powerUp.type === "flame") {
        // Permanent range increase
        player.bombRange += 1;
      } else if (powerUp.type === "speed") {
        // Permanent speed increase (25% faster)
        player.speed = Math.round(player.speed * 1.25 * 100) / 100;
      }

      gameState.map.powerUps.splice(powerUpIndex, 1);

      broadcast({
        type: "powerUpPickup",
        powerUpId: powerUp.id,
      });
      sendPlayerUpdate(player);
    }
    
    broadcast({ type: "playerMoved", id, position: newPosition, oldPosition });
  }
}

// Get the initial player positions based on the map size
export function getPlayerPositions(width = 15, height = 13) {

  // Define the exact corner positions for each player.
  const positions = [
    { x: 1, y: 1 }, // Player 1: Top-Left
    { x: width - 2, y: 1 }, // Player 2: Top-Right
    { x: 1, y: height - 2 }, // Player 3: Bottom-Left
    { x: width - 2, y: height - 2 }, // Player 4: Bottom-Right
  ];

  return positions;
}

// Send player update to all clients or a specific client
function sendPlayerUpdate(player, position = null, ws = null) {
    if (!player) return;

    const message = {
        type: "playerUpdate",
        player: {
        id: player.id,
        nickname: player.nickname,
        lives: player.lives,
        alive: player.alive,
        position: player.position,
        speed: player.speed,
        bombCount: player.bombCount,
        bombRange: player.bombRange,
        immune: false,
      }
    };
    if (!position) {
      message.player.position = null;
    }

    if (ws) {
      sendMsg(ws, message);
    } else {
      broadcast(message);
    }
}