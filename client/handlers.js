import { on, emit } from "../framework/index.js";
import { sendMessage } from "./ws.js";
import {
  startGame,
  updateGameEnded,
  updatePlayerPosition,
  placeBomb,
  showExplosion,
  updatePlayer,
  renderStaticBoard,
  renderPlayers,
  renderPowerUps,
  updateMapTiles,
  gameEnded,
  reset,
  updateEliminationMessage,
  updateAllPlayerLives,
  updateSinglePlayerLives,
} from "./logic.js";

console.log("Handlers loaded");

on("playerJoined", ({ id, nickname }) => {
  localStorage.setItem("user", JSON.stringify({ id, nickname }));
  window.location.hash = "/lobby";
  sendMessage({ type: "lobby", id });
});

on("showError", (message) => {
  const errorEl = document.getElementById("error");
  if (errorEl) errorEl.textContent = message;
});

function appendChatMessage(nickname, message) {
  const chatContainer = document.getElementById("chat");
  if (chatContainer) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("chat-message");

    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.nickname === nickname) {
      messageElement.classList.add("my-message");
    }

    // Use innerHTML to allow for styling of nickname and message separately
    messageElement.innerHTML = `<span class="chat-nickname">${nickname}:</span> <span class="chat-text">${message}</span>`;
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the bottom

    // Show notification for new messages from others when chat is collapsed
    const chatArea = document.getElementById("chat-area");
    const notification = document.getElementById("chat-notification");
    const messageTime = Date.now();

    if (
      chatArea &&
      notification &&
      chatArea.classList.contains("collapsed") &&
      user &&
      user.nickname !== nickname &&
      messageTime > (window.lastNotificationCleared || 0)
    ) {
      notification.style.display = "block";
    }
  }
}

on("newChat", ({ nickname, message }) => {
  appendChatMessage(nickname, message);
});

on("updatePlayerCount", ({ count, players, gameFull, chatHistory }) => {
  // update count
  const countEl = document.getElementById("player-count");
  if (countEl) countEl.textContent = `Players: ${count}/4`;

  // update player list
  const playerListEl = document.getElementById("player-list");
  if (playerListEl) {
    playerListEl.innerHTML = "";
    players.forEach((player) => {
      const li = document.createElement("li");
      li.textContent = player;
      playerListEl.appendChild(li);
    });
  }

  const chatContainer = document.getElementById("chat");
  if (chatContainer && chatContainer.innerHTML === "") {
    if (chatHistory) {
      chatHistory.forEach((entry) => {
        appendChatMessage(entry.nickname, entry.message);
      });
    }
  }

  // update game full status
  const errorEl = document.getElementById("error");
  if (errorEl) errorEl.textContent = gameFull ? "Game is full" : "";
});

// countdown handler
on("readyTimer", ({ countdown }) => {
  const timerContainer = document.getElementById("timer");
  if (timerContainer) {
    timerContainer.textContent = `Game starting in: ${countdown} s`;
  }
});

// waiting timer handler
on("waitingTimer", ({ timeLeft }) => {
  const timerContainer = document.getElementById("timer");
  if (timerContainer) {
    timerContainer.textContent = `Waiting for more players... Starting in: ${timeLeft} s`;
  }
});

// Handle game start message
on("gameStarted", ({ map, players, chatHistory }) => {
  renderStaticBoard(map);
  renderPlayers(players, map.width);
  renderPowerUps(map.powerUps, map.width); // Add this line

  updateAllPlayerLives(players);
  startGame();

  const chatContainer = document.getElementById("chat");
  if (chatContainer && chatContainer.innerHTML === "") {
    chatHistory.forEach((entry) => {
      appendChatMessage(entry.nickname, entry.message);
    });
  }
});

// Handle player movement updates from the server
on("playerMoved", ({ id, position }) => {
  updatePlayerPosition(id, position);
});

// Handle bomb placement
on("bombPlaced", ({ bomb }) => {
  placeBomb(bomb);
});

// Handle explosion
on("explosion", ({ bombId, explosion, updatedMap, players }) => {
  // Only remove the specific bomb that exploded
  const bombEl = document.querySelector(`.bomb-${bombId}`);
  if (bombEl) {
    bombEl.remove();
  }

  // Update only the map tiles, don't re-render the entire board
  updateMapTiles(explosion.tiles, updatedMap.powerUps); // only render the tiles that were affected by the explosion
  for (const player of players) {
    updatePlayer(player); // update player positions and states
  }
  //renderPowerUps(updatedMap.powerUps, updatedMap.width);
  showExplosion(explosion);
});

// Handle player updates (e.g., losing a life)
on("playerUpdate", ({ player }) => {
  console.log("Player update", player);
  if (player.lives <= 0 || player.alive === false) {
    return;
  }
  updatePlayer(player);
  updateSinglePlayerLives(player);
});

// Handle player elimination when they lose all lives by removing avatar and showing a message
on("playerEliminated", (player) => {

    // remove avatar from the game board
    const avatar = document.querySelector(`.player[data-player-id="${player.id}"]`);
    if (avatar) {
      avatar.remove();
    }
    updateSinglePlayerLives(player); // Update the player's lives display when player.lives === 0
    const user = JSON.parse(localStorage.getItem("user")); // if it is the current user who's eliminated, update the elimination message
      if (!gameEnded && user && user.id === player.id) {
      updateEliminationMessage();
  }
});

// Handle game end
on("gameEnded", ({ winner }) => {
  if (gameEnded) return; // Prevent multiple game end messages
  updateGameEnded(true);
  updateEliminationMessage();
  const gameOver = document.createElement("div");
  gameOver.id = "game-over";
  if (winner !== null) {
    gameOver.innerHTML = `The shadows fall... The victor emerges: ${winner}. <br> <button id="back-to-menu">Back to Start</button>`;
  } else {
    gameOver.innerHTML = `"Moonlight lingers on the ruins. All have fallen." <br> <button id="back-to-menu">Back to Start</button>`;
  }
  document.body.appendChild(gameOver);

  document.getElementById("back-to-menu").addEventListener("click", () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      sendMessage({ type: "leaveGame", id: user.id });
    }
    emit("reset");
    const gameOverEl = document.getElementById("game-over");
    if (gameOverEl) {
      document.body.removeChild(gameOverEl);
    }
  });
});

on("gameUpdate", ({ gameState, players, chatHistory }) => {
  // Update the game state, players, and chat history when reloaded
  renderStaticBoard(gameState.map);
  renderPlayers(players, gameState.map.width);

  const chatContainer = document.getElementById("chat");
  if (chatContainer && chatContainer.innerHTML === "") {
    chatHistory.forEach((entry) => {
      appendChatMessage(entry.nickname, entry.message);
    });
  }
});

// Handle power-up pickup
on("powerUpPickup", ({ playerId, powerUpId, newPowerUps }) => {
  // Remove power-up from DOM
  const powerUpEl = document.querySelector(`[data-powerup-id="${powerUpId}"]`);
  if (powerUpEl) {
    powerUpEl.remove();
  }
});

on("reset", () => {
  reset();
});
