import { chatHistory } from './chat.js';
import { clients, broadcast, sendMsg } from './connection.js'; // Import the clients map to manage connections

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