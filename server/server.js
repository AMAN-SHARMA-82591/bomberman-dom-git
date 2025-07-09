import { WebSocketServer } from "ws"; // Import server from 'ws' package
import { startGame, gameState, checkGameEnd, endGame } from "./game/state.js";
import {
  clients,
  broadcast,
  sendMsg,
  updateConnection,
} from "./handlers/connection.js";
import { handleJoin, readyTimer, sendLobbyUpdate } from "./handlers/pregame.js";
import {
  players,
  deactivatePlayer,
  handlePlayerMove,
} from "./handlers/players.js";
import { count, updateCount } from "./game/utils.js";
import { handlePlaceBomb } from "./handlers/bombs.js";
import { handleNewChat } from "./handlers/chat.js";

const server = new WebSocketServer({ port: 8080 });

// Handle incoming WebSocket connections
server.on("connection", (ws) => {
  ws.on("message", (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      sendMsg(ws, { type: "error", message: "Invalid JSON" });
      return;
    }

    if (!data.type) return;
    console.log("Received message type:", data);
    console.log(clients.size, "clients connected");

    let id = data.id ?? null;

    if (data.type !== "join" && data.type !== "gameStart" && id === null) {
      // Check if id is provided for non-join messages
      sendMsg(ws, { type: "error", message: "Missing playerID" });
      return;
    } else if (
      !clients.has(id) &&
      data.type !== "join" &&
      data.type !== "gameStart"
    ) {
      // Check if client exists
      console.log("Client not found by id:", id);
      console.log("Available clients:", Array.from(clients.keys()));
      sendMsg(ws, { type: "reset" });
      return;
    }

    // Handle message types
    switch (data.type) {
      case "join": // Join a game with a nickname
        // check if game has started
        handleJoin(id, ws, data);
        readyTimer(); // Start the ready timer if needed
        break;

      case "lobby":
        // Check if player is in an active game
        const playerInGame =
          players.has(id) &&
          players.get(id).alive &&
          (gameState.status === "running" || gameState.status === "countdown");

        if (playerInGame) {
          // Force redirect back to game
          sendMsg(ws, { type: "forceGameRedirect" });
        } else if (
          gameState.status === "running" ||
          gameState.status === "ended"
        ) {
          startGame(ws); // Send game state to the client
        } else {
          sendLobbyUpdate();
        }

        break;

      case "chat": // Handle chat messages
        handleNewChat(id, data);
        break;

      case "gameStart":
        updateCount(); // Increment the count of gameStart messages
        if (count === players.size) {
          // Check if all players are ready
          // count gameStart messages and when all ready, broadcast game start
          startGame(); // Start the game if all players are ready
        }
        break;

      case "move":
        handlePlayerMove(id, data.direction);
        break;

      case "placeBomb":
        handlePlaceBomb(id);
        break;

      case "gameUpdate": // Handle game state updates
        // Need to update the game state on server side
        broadcast({ type: "gameUpdate", state: data.state });
        break;

      case "pageReload": // update connection when pages are reloaded
        if (clients.has(id)) {
          updateConnection(id, ws);
          console.log("PageReload for status:", gameState.status);
          if (gameState.status !== "running" && gameState.status !== "ended") {
            sendLobbyUpdate(ws); // Send updated player count and list
          } else {
            startGame(ws); // Send game state to the client
          }
        } else {
          // Client not found, send reset message
          sendMsg(ws, { type: "reset" });
        }
        break;

      case "leaveGame":
        deactivatePlayer(id); // Deactivate player
        clients.delete(id); // Remove client from the map
        checkGameEnd(); // Check if game has ended
        break;

      default: // Handle unknown message types
        sendMsg(ws, { type: "error", message: "Unknown message type" });
        return;
    }
  });

  // Delete connection when client disconnects
  ws.on("close", () => {
    for (const [id, client] of clients.entries()) {
      if (client.ws === ws) {
        // Give the client 2 seconds to reconnect (for page reloads)
        setTimeout(() => {
          clearConnection(ws); // Clear the connection
        }, 2000);
        break;
      }
    }
  });
});

function clearConnection(ws) {
  if (!ws) return; // If WebSocket is not provided, do nothing
  for (const [id, client] of clients.entries()) {
    if (client.ws === ws) {
      clients.delete(id);
      if (gameState.status === "running" || gameState.status === "ended") {
        deactivatePlayer(id); // Deactivate player if game is running
      } else {
        broadcast({
          type: "lobbyUpdate",
          count: clients.size,
          players: Array.from(clients.values()).map((c) => c.nickname),
        });
      }
      break;
    }
  }
}
