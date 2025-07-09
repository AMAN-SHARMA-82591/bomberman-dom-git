import { chatHistory } from "../handlers/chat.js";
import { broadcast, clients, sendMsg } from "../handlers/connection.js";
import { players, playerPositions, getPlayerPositions } from "../handlers/players.js";
import { updateCount } from "./utils.js";
import { generateGameMap } from "../handlers/map.js";

let readyTimer = null;

export const gameState = {
  status: "waiting", // 'waiting' | 'countdown' | 'running' | 'ended'
  players: {}, // key = playerId
  map: {
    // Game map configuration
    width: 0,
    height: 0,
    tiles: [], // 2D array of 'empty' | 'wall' | 'destructible-wall'
    powerUps: [], // [{x, y, type}]
  },
  bombs: [],
  explosions: [],
  powerUpCounts: { bomb: 4, flame: 4, speed: 2 },
  lastUpdate: Date.now(),
};

// New functions for game management
export function startCountdown() {
  if (readyTimer) return;
  gameState.status = "countdown";
  let countdown = 10;

  // Generate the map when countdown starts
  gameState.map = generateGameMap();
  playerPositions.length = 0; // Reset player positions
  playerPositions.push(...getPlayerPositions(gameState.map.width, gameState.map.height)); // Get initial positions based on the new map

  broadcast({ type: "readyTimer", countdown });

  readyTimer = setInterval(() => {
    // If players leave during countdown, cancel it
    if (clients.size < 2) {
      clearInterval(readyTimer);
      readyTimer = null;
      gameState.status = "waiting";
      players.clear(); // Clear players added for the game
      broadcast({ type: "readyTimer", countdown: null }); // Tell clients to clear timer
      return;
    }

    countdown--;
    broadcast({ type: "readyTimer", countdown });

    if (countdown <= 0) {
      clearInterval(readyTimer);
      broadcast({ type: "gameState" });
      updateCount(true); // Reset count when game starts
      readyTimer = null;
    }
  }, 1000);
}

export function startGame(ws = null) {
  gameState.status = "running";
  const message = {
    type: "gameStarted",
    map: gameState.map,
    players: Array.from(players.values()),
    chatHistory,
  };

  if (ws) {
    sendMsg(ws, message);
  } else {
    broadcast(message);
  }
}

export function endGame() {  // Clear game-related state
  console.log("Ending game and resetting state...");
  players.clear();
  updateCount(true);
  gameState.status = "waiting";
  gameState.players = {};
  gameState.bombs = [];
  gameState.explosions = [];
  gameState.map = { width: 0, height: 0, tiles: [], powerUps: [] };
  gameState.powerUpCounts = { bomb: 4, flame: 4, speed: 2 };
  chatHistory.length = 0;
  playerPositions.length = 0;
  readyTimer = null;

  // Broadcast reset message to all clients
  broadcast({ type: "reset" });

  // Schedule delayed clearing of the clients map
  setTimeout(() => {
    console.log("Clearing clients map...");
    clients.clear();
  }, 1000); // Delay to ensure all clients receive the reset message
}

export function checkGameEnd() {
  const alivePlayers = Array.from(players.values()).filter((p) => p.alive);
  if (alivePlayers.length <= 1) {
    // End game if 1 or 0 players are left
    const winner = alivePlayers.length === 1 ? alivePlayers[0] : null;
    gameState.status = "ended";
    broadcast({
      type: "gameEnded",
      winner: winner ? winner.nickname : null,
    });

    setTimeout(endGame, 5000); // Increased delay to 5 seconds
  }
}