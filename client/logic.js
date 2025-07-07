import { sendMessage } from "./ws.js";

// Client-side state for smooth rendering
const clientPlayers = new Map();
const TILE_SIZE = 60; // The size of one tile in pixels

// game loop and input handling logic
let gameLoopActive = false;
const keysPressed = new Set();
let lastMoveTime = 0;
const MOVE_INTERVAL = 50; // Send move requests more often
export let gameEnded = false;
export let gameStarted = false


function handleKeyDown(e) {
  // If the user is typing in the chat input, do not handle game controls.
  if (document.activeElement.id === 'chat-input' || gameEnded ) {
    return;
  }
  const user = JSON.parse(localStorage.getItem("user"));
  if (user && clientPlayers.has(user.id) && clientPlayers.get(user.id).stunned) {
    return;
  }

  console.log("Key pressed:", e.key);
  // Prevent default browser actions for arrow keys
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)
  ) {
    e.preventDefault();
  }
  if (e.key === " ") {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      sendMessage({ type: "placeBomb", id: user.id });
    }
    return; // Don't add space to keysPressed
  }
  keysPressed.add(e.key.toLowerCase());
}

function handleKeyUp(e) {
  keysPressed.delete(e.key.toLowerCase());
}

// NEW: Rendering loop for smooth movement
function clientRenderLoop() {
  if (!gameLoopActive) return;

  const board = document.getElementById("game-board");
  if (!board) return;

  for (const [id, player] of clientPlayers.entries()) {
    if (!player.element) continue;

    // Interpolate position
    const now = Date.now();
    const timeSinceUpdate = now - player.lastUpdateTime;

    // Use player-specific speed for move duration. Must match server's baseCooldown.
    const baseCooldown = 100; // Lower this value to reduce smoothing (e.g., from 200 to 100)
    let moveDuration = baseCooldown / (player.speed || 1);

    // Adjust interpolation duration for higher speeds
    if (player.speed > 0.5) {
      // Use an exponential reduction for a more noticeable effect at higher speeds
      moveDuration /= Math.pow(player.speed, 0.5); // Reduce interpolation duration more aggressively
    }

    // Clamp progress between 0 and 1
    const progress = Math.min(timeSinceUpdate / moveDuration, 1);

    // Linear interpolation (lerp)
    const visualX = player.lastPos.x + (player.targetPos.x - player.lastPos.x) * progress;
    const visualY = player.lastPos.y + (player.targetPos.y - player.lastPos.y) * progress;
    const speedFactor = Math.min(player.speed, 5); // cap the player speed
    moveDuration /= Math.pow(speedFactor, 2); // Reduce interpolation duration more aggressively

    // Update CSS transform
    player.element.style.transform = `translate(${visualX * TILE_SIZE}px, ${visualY * TILE_SIZE}px)`;
  }

  requestAnimationFrame(clientRenderLoop);
}

function gameLoop(timestamp) {
  if (!gameLoopActive) return;

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    stopGame();
    return;
  }

  if (user && clientPlayers.has(user.id) && clientPlayers.get(user.id).stunned) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // Throttle movement requests to avoid sending too many
  if (timestamp - lastMoveTime > MOVE_INTERVAL) {
    let direction = null;
    if (keysPressed.has("arrowup") || keysPressed.has("w")) {
      direction = "up";
    } else if (keysPressed.has("arrowdown") || keysPressed.has("s")) {
      direction = "down";
    } else if (keysPressed.has("arrowleft") || keysPressed.has("a")) {
      direction = "left";
    } else if (keysPressed.has("arrowright") || keysPressed.has("d")) {
      direction = "right";
    }

    if (direction) {
      sendMessage({ type: "move", id: user.id, direction });
      lastMoveTime = timestamp;
    }
  }

  requestAnimationFrame(gameLoop);
}

export function startGame() {
  if (gameLoopActive) return;
  updateGameEnded(false); // Reset gameEnded state
  updateGameStarted(true); // Set gameStarted state to true
  gameLoopActive = true;
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  requestAnimationFrame(gameLoop);
  requestAnimationFrame(clientRenderLoop); // Start the rendering loop
}

export function stopGame() {
  gameLoopActive = false;
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
  keysPressed.clear();
  clientPlayers.clear(); // Clear client-side player state
}

export function renderStaticBoard(map) {
  const board = document.getElementById("game-board");
  if (!board) return;
  if (board.innerHTML !== "") {
    board.innerHTML = "";
  }
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      if (map.tiles[y][x] === "wall") cell.classList.add("wall");
      if (map.tiles[y][x] === "destructible-wall")
        cell.classList.add("destructible-wall");
      cell.dataset.row = y;
      cell.dataset.col = x;
      board.appendChild(cell);
    }
  }
}

export function renderPlayers(players, width) {
  // This function now only creates the player elements once
  const board = document.getElementById("game-board");
  if (!board) return;

  players.forEach((p, i) => {
    if (!p.position || !p.alive) return;

    // Create element if it doesn't exist
    if (!clientPlayers.has(p.id)) {
      const avatarDiv = document.createElement("div");
      avatarDiv.classList.add("player", p.avatar);
      avatarDiv.dataset.playerId = p.id;
      board.appendChild(avatarDiv);

      // Initialize client-side state for this player
      clientPlayers.set(p.id, {
        element: avatarDiv,
        lastPos: { ...p.position },
        targetPos: { ...p.position },
        lastUpdateTime: Date.now(),
        speed: p.speed, // Store initial speed
        lives: p.lives
      });

      // Set initial position
      avatarDiv.style.transform = `translate(${p.position.x * TILE_SIZE}px, ${p.position.y * TILE_SIZE}px)`;
    }
  });
}

export function showExplosion(explosion) {
  const board = document.getElementById("game-board");
  if (!board) return;

  function getExplosionType(tile) {
    if (tile.dx === 0 && tile.dy === 0) return "center";
    // End if it's the farthest in its direction
    const isEnd = tile.distance === Math.max(
      ...explosion.tiles.filter(t => t.dx === tile.dx && t.dy === tile.dy).map(t => t.distance)
    );
    if (isEnd) {
      if (tile.dx === 0 && tile.dy === -1) return "end_up";
      if (tile.dx === 0 && tile.dy === 1) return "end_down";
      if (tile.dx === -1 && tile.dy === 0) return "end_left";
      if (tile.dx === 1 && tile.dy === 0) return "end_right";
    }
    // Directional middle pieces
    if (tile.dx === 0 && tile.dy === -1) return "vertical_up";
    if (tile.dx === 0 && tile.dy === 1) return "vertical_down";
    if (tile.dy === 0 && tile.dx === -1) return "horizontal_right";
    if (tile.dy === 0 && tile.dx === 1) return "horizontal_left";
    return "center";
  }

  explosion.tiles.forEach((tile) => {
    const { x, y } = tile;
    const cell = board.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
    if (cell) {
      const explosionEl = document.createElement("div");
      explosionEl.className = `explosion explosion-${explosion.id}`;

      // Determine which PNG to use
      const type = getExplosionType(tile);
      let img = "";
      switch (type) {
        case "center":
          img = "flame_center.png";
          break;
        case "vertical_up":
          img = "flame_vertical_up.png";
          break;
        case "vertical_down":
          img = "flame_vertical_down.png";
          break;
        case "horizontal_left":
          img = "flame_horizontal_left.png";
          break;
        case "horizontal_right":
          img = "flame_horizontal_right.png";
          break;
        case "end_up":
          img = "flame_top.png";
          break;
        case "end_down":
          img = "flame_bottom.png";
          break;
        case "end_left":
          img = "flame_left.png";
          break;
        case "end_right":
          img = "flame_right.png";
          break;
        default:
          img = "flame_center.png";
      }
      explosionEl.style.backgroundImage = `url('../assets/${img}')`;
      cell.appendChild(explosionEl);

      // If a destructible wall was there, remove its class
      if (cell.classList.contains("destructible-wall")) {
        cell.classList.remove("destructible-wall");
      }
    }
  });

  setTimeout(() => {
    board
      .querySelectorAll(`.explosion-${explosion.id}`)
      .forEach((el) => el.remove());
  }, 700);
}

export function placeBomb(bomb) {
  const { position, id } = bomb;
  const { x, y } = position;
  const board = document.getElementById("game-board");
  if (!board) return;

  const cell = board.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
  if (!cell) return;

  const bombEl = document.createElement("div");
  bombEl.className = `bomb bomb-${id}`;
  cell.appendChild(bombEl);
}
export function updatePlayer(player) {
  const { id, alive, lives, position } = player;

  const avatar = document.querySelector(`.player[data-player-id="${id}"]`);
  if (!avatar) return;

   // Update client-side state if it exists
  if (clientPlayers.has(id)) {
    const playerState = clientPlayers.get(id);

    // If this is the first update, initialize lives
    if (typeof playerState.lives === "undefined") {
      playerState.lives = lives;
    }

    // Only show hurt animation if lives decreased
    if (lives < playerState.lives) {
      avatar.classList.add("hurt");
      playerState.stunned = true;
      setTimeout(() => {
        avatar.classList.remove("hurt");
        playerState.stunned = false;
      }, 1000);
    }

    if (player.speed !== undefined) {
      playerState.speed = player.speed;
    }
    playerState.lives = lives;

    // update position visually if changed
    if (
      position &&
      (playerState.targetPos.x !== position.x || playerState.targetPos.y !== position.y)
    ) {
      playerState.lastPos = { ...position };
      playerState.targetPos = { ...position };
      playerState.lastUpdateTime = Date.now();
      playerState.element.style.transform = `translate(${position.x * TILE_SIZE}px, ${position.y * TILE_SIZE}px)`;
    }
  }

  avatar.classList.toggle("dead", alive === false);

  if (alive === false) {
    avatar.remove();
    clientPlayers.delete(id);
  }
}

export function leaveGame(id) {
  if (!id) return;
  sendMessage({ type: "leaveGame", id });
  localStorage.removeItem("user");
  stopGame(); // Stop the loop and remove listeners
  window.location.hash = "/";
}

export function updatePlayerPosition(id, position) {
  if (clientPlayers.has(id)) {
    const playerState = clientPlayers.get(id);

    // If the player is being reset to a spawn (e.g. after losing a life), snap instantly
    const isTeleport = (
      Math.abs(playerState.targetPos.x - position.x) > 1 ||
      Math.abs(playerState.targetPos.y - position.y) > 1
    );
    if (isTeleport) {
      playerState.lastPos = { ...position };
      playerState.targetPos = { ...position };
      playerState.lastUpdateTime = Date.now();
      playerState.element.style.transform = `translate(${position.x * TILE_SIZE}px, ${position.y * TILE_SIZE}px)`;
    } else {
      // Normal movement interpolation
      playerState.lastPos = { ...playerState.targetPos };
      playerState.targetPos = { ...position };
      playerState.lastUpdateTime = Date.now();
    }
  }
}

// Add this function to render power-ups:

export function renderPowerUps(powerUps) {
  if (!powerUps) return;

  const board = document.getElementById("game-board");
  if (!board) return;

  const existingPowerUpIds = new Set(powerUps.map(p => p.id));
  const powerUpElements = board.querySelectorAll(".power-up");

  // Remove power-ups that are no longer in the state
  powerUpElements.forEach(el => {
    if (!existingPowerUpIds.has(el.dataset.powerupId)) {
      el.remove();
    }
  });

  // Add new power-ups
  powerUps.forEach((powerUp) => {
    addPowerUp(powerUp);
  });
    
}

function addPowerUp(powerUp) {
  const board = document.getElementById("game-board");
  if (!board) return;

  const cell = board.querySelector(
      `.cell[data-row="${powerUp.y}"][data-col="${powerUp.x}"]`
    );
    if (!cell) return;

    const powerUpEl = document.createElement("div");
    powerUpEl.className = "power-up";
    powerUpEl.dataset.powerupId = powerUp.id;
    powerUpEl.dataset.powerupType = powerUp.type; // Add type for CSS

    // Set tooltip based on type
    if (powerUp.type === "bomb") {
      powerUpEl.title = "+1 Bomb";
    } else if (powerUp.type === "flame") {
      powerUpEl.title = "+1 Range";
    } else if (powerUp.type === "speed") {
      powerUpEl.title = "+50% Speed";
    }

    cell.appendChild(powerUpEl);
}

export function updateMapTiles(tiles, powerUps) {
  const board = document.getElementById("game-board");
  if (!board) return;

  for (const {x, y} of tiles) {
    const cell = board.querySelector(`.cell[data-row="${y}"][data-col="${x}"]`);
    if (!cell) continue;
      // Remove existing classes
      cell.classList.remove("destructible-wall");

      // Add new class based on tile type
      const powerUp = powerUps.find(p => p.x === x && p.y === y);
      if (powerUp) {
        addPowerUp(powerUp);
      }
  }
}

// reset to start page by removing user from localStorage and redirecting to main page
// and updating gameStarted state
export function reset() {
    stopGame();
    localStorage.removeItem('user');
    window.location.hash = '/';
    updateGameStarted(false);
}

export function updateGameStarted(status) {
  gameStarted = status;
}

export function updateGameEnded(status) {
  if (!status) return;
    gameEnded = status;
}

export function updateEliminationMessage() {
      // create a div to show the message
    const container = document.getElementById("elimination-message");
    if (container) {
      if (gameEnded) {
        container.style.display = "none";
      } else {
        container.style.display = "block";
      }
    }
}

function generatePlayerLives(player) {
  const showLives = player.lives > 0 && player.alive !== false;
  const lifeIcons = showLives
    ? Array(player.lives).fill('<img src="./assets/lives.png" alt="Life" class="icon" />').join('')
    : '';

  const bombsHtml = `
    <span class="powerups">Power-ups: </span>
    <span class="player-bombs">Bombs: ${
      player.bombCount > 1
        ? '<img src="./assets/powerup_bomb.png" alt="Bomb" class="icon" />'.repeat(player.bombCount - 1)
        : ''
    }</span>`;

  const rangeHtml = `
    <span class="player-range">Range: ${
      player.bombRange > 1
        ? '<img src="./assets/powerup_range.png" alt="Range" class="icon" />'.repeat(player.bombRange - 1)
        : ''
    }</span>`;

  const speedPowerUps = Math.max(0, Math.round((player.speed - 0.5) / 0.25));
  const speedHtml = `
    <span class="player-speed">Speed: ${
      speedPowerUps > 0
        ? '<img src="./assets/powerup_speed.png" alt="Speed" class="icon" />'.repeat(speedPowerUps)
        : ''
    }</span>`;

  return `
    <div class="player-top">
      <span class="player-nick">${player.nickname}</span>
      <span class="player-lives">${lifeIcons}</span>
    </div>
    <div class="player-bottom">
      ${bombsHtml}
      ${rangeHtml}
      ${speedHtml}
    </div>
  `;
}


export function updateAllPlayerLives(players) {
  const livesEl = document.getElementById("player-lives");
  if (!livesEl || !Array.isArray(players)) return;

  livesEl.innerHTML = '';

  players.forEach(player => {
    if (!player) return;

    const div = document.createElement("div");
    div.className = "player-lives-info";
    div.dataset.playerId = player.id;
    div.innerHTML = generatePlayerLives(player);
    livesEl.appendChild(div);
  });
}


export function updateSinglePlayerLives(player) {
  if (!player) return;

  const el = document.querySelector(`.player-lives-info[data-player-id="${player.id}"]`);
  const livesEl = document.getElementById("player-lives");
  if (!livesEl) return;

  if (el) {
    el.innerHTML = generatePlayerLives(player);
  } else {
    const div = document.createElement("div");
    div.className = "player-lives-info";
    div.dataset.playerId = player.id;
    div.innerHTML = generatePlayerLives(player);
    livesEl.appendChild(div);
  }
}
