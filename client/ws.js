import {emit}  from '../framework/index.js';

let socket;
export let error = null;

function connect() {
    socket = new WebSocket('ws://localhost:8080/ws');

    socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
    });

    // Listen for messages from the server
    socket.addEventListener('message', (event) => {

    const msg = JSON.parse(event.data);
    console.log("message received:", msg)
    switch (msg.type) {
    case 'reset' :
        emit('reset');
        break;
    case 'readyTimer':
        emit('readyTimer', { countdown: msg.countdown });
        break;
    case 'waitingTimer':
        emit('waitingTimer', { timeLeft: msg.timeLeft });
        break;
    case 'gameState':
        window.location.hash = '/game'; // Redirect to game page
        sendMessage({ type: 'gameStart'});
        break;
    case 'playerExists':
        // If player already exists, redirect to lobby
        window.location.hash = '/lobby'; // Redirect to lobby page
        emit('playerJoined', { id: msg.id, nickname: msg.nickname });
        break;
    case 'chat':
        console.log("chat message received:", msg);
        if (window.location.hash === '/') return;
        emit('newChat', {nickname: msg.nickname, message: msg.message});
        break;
    case 'error':
        emit('showError', msg.message);
        break;
    case 'playerCount':
        console.log("player count message received:", msg);
        emit('updatePlayerCount', {count: msg.count, players: msg.players, gameFull: msg.gameFull, chatHistory: msg.chatHistory});
        break;
    case 'playerJoined':
        console.log("player joined message received:", msg);
        emit('playerJoined', { id: msg.id, nickname: msg.nickname });
        break;
    case 'gameStarted':
        console.log("game started message received:", msg);
        emit('gameStarted', { map: msg.map, players: msg.players, chatHistory: msg.chatHistory });
        break;
    case 'playerMoved':
        emit('playerMoved', { id: msg.id, position: msg.position, oldPosition: msg.oldPosition});
        break;
    case 'bombPlaced':
        emit('bombPlaced', { bomb: msg.bomb });
        break;
    case 'explosion':
        emit('explosion', { bombId: msg.bombId, explosion: msg.explosion, updatedMap: msg.updatedMap, players: msg.players });
        break;
    case 'playerUpdate':
        emit('playerUpdate', { player: msg.player });
        break;
    case 'playerEliminated':
        emit('playerEliminated', { id: msg.id, nickname: msg.nickname });
        break;
    case 'gameUpdate':
        emit('gameUpdate', { gameState: msg.gameState, players: msg.players, chatHistory: msg.chatHistory });
        break;
    case 'gameEnded':
        emit('gameEnded', { winner: msg.winner });
        break;
    case 'powerUpPickup':
        emit('powerUpPickup', { 
          playerId: msg.playerId, 
          powerUpId: msg.powerUpId,
          newPowerUps: msg.newPowerUps 
        });
        break;
    }
        
    })

}
connect();

export function sendMessage(message) {
    if (message.type === null || message.type === undefined) return;
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  } else {
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify(message));
    }, { once: true });
  }
}

