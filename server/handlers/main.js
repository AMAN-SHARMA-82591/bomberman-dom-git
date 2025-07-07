import { clients, broadcast, sendMsg } from "./connection.js";
import { addPlayer, startCountdown } from "../game/state.js";

let waitTimer = null;
let firstJoinTime = null;

export function handleJoin(id, ws, data) {

  if (clients.has(id)) { // Prevent re-joining
      sendMsg(ws, { type: 'playerExists', id: id, nickname: clients.get(id).nickname }); // Notify client of successful join
      return;
    }; 

  if (clients.size > 4) { // Limit to 4 players
    sendMsg(ws, { type: 'error', message: 'Game is full', gameFull: clients.size > 4 });
    return;

  } else {
    const error = validateNickname(data); // Validate nickname
    if (error) {
      sendMsg(ws, error); // Send error if nickname is invalid
      return;
    }

    id = crypto.randomUUID(); // create unique ID
    clients.set(id, { ws, nickname: data.nickname.trim() }); // Store id, connection andn nickname
    sendMsg(ws, { type: 'playerJoined', id: id, nickname: clients.get(id).nickname}); // Notify client of successful join
  }
}

export function readyTimer() {
    if (clients.size === 2 && !waitTimer) {
      firstJoinTime = Date.now();
      
      // Broadcast initial waiting message
      broadcast({ type: 'waitingTimer', timeLeft: 2 });
      
      waitTimer = setInterval(() => {
        if (clients.size < 2) {
          clearInterval(waitTimer);
          waitTimer = null;
          firstJoinTime = null;
        } else if (clients.size === 4) {
          statusCountdown();
        } else if (Date.now() - firstJoinTime > 2000) {
          if (clients.size >= 2) {
            statusCountdown();
          }
        } else {
          // Calculate and broadcast remaining time
          const timeLeft = Math.ceil((2000 - (Date.now() - firstJoinTime)) / 1000);
          broadcast({ type: 'waitingTimer', timeLeft });
        }
      }, 1000); // Check every second
    }
}



function statusCountdown() {
  startCountdown();
  for (const [id, client] of clients) {
    addPlayer({ id, nickname: client.nickname }); // Add players to the game state
  }
  clearInterval(waitTimer);
  waitTimer = null;
  firstJoinTime = null;
}


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

  return null; // valid
}