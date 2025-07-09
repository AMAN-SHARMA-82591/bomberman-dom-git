import { clients, broadcast, sendMsg } from "./connection.js";
import { startCountdown, gameState, startGame } from "../game/state.js";
import { addPlayer } from "./players.js";
import { chatHistory } from "./chat.js"; // Import chat history for lobby updates

let waitTimer = null;
let firstJoinTime = null;

// Handles a new player joining the game
// Validates the nickname, checks if the game is full, and assigns a unique ID
// Sends the joining or rejection message back to the client
export function handleJoin(id, ws, data) {

  if (clients.has(id)) { // Prevent re-joining
    sendMsg(ws, { type: 'playerExists', id: id, nickname: clients.get(id).nickname });
    if (gameState.status === 'running' || gameState.status === 'ended') {
      startGame(ws); // Redirect to game if it has started
    }
    return;
  } else if (gameState.status !== 'waiting') { // Check if game has already started
    sendMsg(ws, { type: 'error', message: 'Game has already started' });
    return;
  } 

  if (clients.size >= 4) { // Limit to 4 players
    sendMsg(ws, { type: 'error', message: 'Game is full', gameFull: clients.size >= 4 });
    return;

  } else {
    const error = validateNickname(data);
    if (error) {
      sendMsg(ws, error);
      return;
    }

    id = crypto.randomUUID(); // create unique ID
    clients.set(id, { ws, nickname: data.nickname.trim() }); // Store id, connection andn nickname
    sendMsg(ws, { type: 'playerJoined', id: id, nickname: clients.get(id).nickname});
  }
}

// Sends a lobby update to all clients or a specific client
// Includes player count, nicknames, game full status, and chat history
export function sendLobbyUpdate(ws = null) {
  const message = { 
    type: 'lobbyUpdate', 
    count: clients.size, 
    players: Array.from(clients.values()).map(c => c.nickname), 
    gameFull: clients.size > 4, 
    chatHistory
  };

  if (ws) {
    sendMsg(ws, message);
  } else {
    broadcast(message);
  }
}

// Handles the 20 sec timer during which more players can join the game
// If 4 players join, the game countdown immediately
export function readyTimer() {
    if (clients.size === 2 && !waitTimer) {
      firstJoinTime = Date.now();
      
      // Broadcast initial waiting message
      broadcast({ type: 'waitingTimer', timeLeft: 20 });
      
      waitTimer = setInterval(() => {
        if (clients.size < 2) {
          clearInterval(waitTimer);
          waitTimer = null;
          firstJoinTime = null;
        } else if (clients.size === 4) {
          statusCountdown();
        } else if (Date.now() - firstJoinTime > 20000) {
          if (clients.size >= 2) {
            statusCountdown();
          }
        } else {
          // Calculate and broadcast remaining time
          const timeLeft = Math.ceil((20000 - (Date.now() - firstJoinTime)) / 1000);
          broadcast({ type: 'waitingTimer', timeLeft });
        }
      }, 1000); // Check every second
    }
}


// Starts the countdown to the game and adds registered players to the game state
function statusCountdown() {
  startCountdown();
  for (const [id, client] of clients) {
    addPlayer({ id, nickname: client.nickname }); // Add players to the game state
  }
  clearInterval(waitTimer);
  waitTimer = null;
  firstJoinTime = null;
}

// Validates the nickname provided by the client, nickname must be unique and not empty
export function validateNickname(data) {
  if (!data.nickname || data.nickname.trim() === '') {
    return { type: 'error', message: 'Nickname missing' };
  }

  const nickname = data.nickname.trim().toLowerCase();

  for (let client of clients.values()) {
    if (client.nickname.toLowerCase() === nickname) {
      return { type: 'error', message: 'Nickname already taken' };
    }
  }

  return null;
}