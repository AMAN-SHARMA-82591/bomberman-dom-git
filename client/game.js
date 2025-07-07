import { Chat } from "./chat.js";
import { sendMessage } from "./ws.js";
import { stopGame, gameStarted } from "./logic.js";
import { emit } from "../framework/index.js";

export function Game() {
  if (gameStarted) return; // Prevent multiple game instances

  console.log("Game component loaded");

  const user = JSON.parse(localStorage.getItem("user"));
  console.log("User in Game component:", user);

  if (!user) {
    console.log("No user found");
    emit("reset");
    return;
  }

  document.getElementById("background-video").style.display = "none";
  const bgMusic = document.getElementById("background-music");
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }

  return {
    tag: "div",
    attrs: { id: "game-page-container" },
    children: [
      {
        tag: "div",
        attrs: { 
          id: "elimination-message",
          style: "display: none;", 
        },

        children: [
          "You have fallen into the dusk, but still may watch and whisper among the shadows.",
        ],
      },
      {
        tag: "div",
        attrs: { id: "game-container" },
        children: [
          {
            tag: "h2",
            children: ["Twilight Inferno"],
          },
          {
            tag: "div",
            attrs: { id: "player-lives" },
            children: [],
          },
          {
            tag: "div",
            attrs: { id: "game-board" },
            children: [],
          },
          {
            tag: "p",
            attrs: { id: "game-info" },
            children: [],
          },
          {
            tag: "button",
            attrs: {
              id: "leave-game-button", // Add an ID for styling
              onclick: () => {
                sendMessage({ type: "leaveGame", id: user.id });
                stopGame(); // Stop the loop and remove listeners
                emit("reset");
              },
            },
            children: ["Leave Game"],
          },
        ],
      },
      {
        tag: "div",
        attrs: { id: "chat-area", class: "collapsed" },
        children: [
          {
            tag: "div",
            attrs: {
              id: "chat-toggle",
              onclick: () => {
                const chatArea = document.getElementById("chat-area");
                chatArea.classList.toggle("collapsed");
                // Hide notification when opened
                if (!chatArea.classList.contains("collapsed")) {
                  const notification =
                    document.getElementById("chat-notification");
                  if (notification) {
                    notification.style.display = "none";
                    window.lastNotificationCleared = Date.now();
                  }
                }
              },
            },
            children: [
              "💬",
              {
                tag: "span",
                attrs: { id: "chat-notification" },
                children: ["!"],
              },
            ],
          },
          Chat({ playerID: user.id, nickname: user.nickname }),
        ],
      },
    ],
  };
}
