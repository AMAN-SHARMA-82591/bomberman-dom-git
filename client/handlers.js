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
  window.location.hash = "/lobby"; // Redirect to lobby page
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

on("updateLobby", ({ count, players, gameFull, chatHistory }) => {
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
  renderPowerUps(map.powerUps); // Remove width parameter as it's not needed

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

  let countdown = 5;
  
  const updateMessage = () => {
    if (winner !== null) {
      gameOver.innerHTML = `The shadows fall... The victor emerges: ${winner}. <br> Returning to menu in ${countdown}`;
    } else {
      gameOver.innerHTML = `"Moonlight lingers on the ruins. All have fallen." <br> Returning to menu in ${countdown}`;
    }
  };

  updateMessage(); // Initial message
  document.body.appendChild(gameOver);

  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      updateMessage();
    } else {
      clearInterval(countdownInterval);
      // The 'reset' event from the server will handle the cleanup.
    }
  }, 1000); // update every second
});

on("gameUpdate", ({ gameState, players, chatHistory }) => {
  // Update the game state, players, and chat history when reloaded
  // Use setTimeout to ensure DOM is ready after router re-render
  setTimeout(() => {
    const gameBoard = document.getElementById("game-board");
    if (!gameBoard) {
      console.warn("Game board not found, skipping game update");
      return;
    }
    
    renderStaticBoard(gameState.map);
    renderPlayers(players, gameState.map.width);
    renderPowerUps(gameState.map.powerUps);
    updateAllPlayerLives(players);
    startGame(); // Ensure game loop is running

    const chatContainer = document.getElementById("chat");
    if (chatContainer && chatContainer.innerHTML === "") {
      chatHistory.forEach((entry) => {
        appendChatMessage(entry.nickname, entry.message);
      });
    }
  }, 100); // Small delay to ensure DOM is mounted
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
