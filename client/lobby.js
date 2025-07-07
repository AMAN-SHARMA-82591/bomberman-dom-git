import { sendMessage } from "./ws.js";
import { Chat } from "./chat.js";

const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  window.location.hash = "/";
  // setState({ page: '/' });
} else {
  const page = window.location.hash.replace("#", ""); // removes the '#' char

  sendMessage({ type: "pageReload", id: user.id, page });
}

export function Lobby() {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) {
    window.location.hash = "/";
    return;
  }
  const nickname = user.nickname;
  const playerID = user.id;

  return {
    tag: "div",
    attrs: { id: "lobby-page",
      class: "centered-page"
     },
    children: [
      {
        tag: "div",
        attrs: { class: "lobby-container" },
        children: [
          {
            tag: "h1",
            attrs: {},
            children: ["Lobby"],
          },
          {
            tag: "p",
            attrs: { id: "welcome" },
            children: [`Welcome, ${nickname}!`],
          },
          {
            tag: "p",
            attrs: { id: "player-count" },
            children: [],
          },
          {
            tag: "ul",
            attrs: { id: "player-list" },
            children: [],
          },
          {
            tag: "p",
            attrs: { id: "timer" },
            children: [],
          },
          {
            tag: "button",
            attrs: {
              id: "music-btn",
              onclick: () => {
                const audio = document.getElementById("background-music");
                const btn = document.getElementById("music-btn");
                if (audio && btn) {
                  if (audio.muted || audio.paused) {
                    audio.muted = false;
                    audio.play();
                    btn.style.backgroundImage = 'url("./assets/volume.png")';
                  } else {
                    audio.muted = true;
                    btn.style.backgroundImage = 'url("./assets/mute.png")';
                  }
                }
              },
            },
            children: [" "],
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
                    if (!chatArea.classList.contains("collapsed")) {
                      document.getElementById("chat-input").focus();
                      // Hide notification when opened
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
              Chat({ playerID, nickname }),
            ],
          },
          {
            tag: "p",
            attrs: { id: "error"},
            children: [],
          },
        ],
      },
      {
        tag: "div",
        attrs: { class: "info-section" },
        children: [
          {
            tag: "h2",
            children: ["How to Play"],
          },
          {
            tag: "p",
            children: [
              "Forks trembles beneath the weight of ancient grudges and very unstable explosives.",
            ],
          },
          {
            tag: "ul",
            children: [
              { tag: "li", children: ["Use arrow keys or WASD to move."] },
              { tag: "li", children: ["Press space to place a bomb."] },
              {
                tag: "li",
                children: ["Collect power-ups to gain an advantage."],
              },
              { tag: "li", children: ["Be the last player standing to win!"] },
            ],
          },
          {
            tag: "p",
            children: ["Power-ups include:"],
          },
          {
            tag: "ul",
            children: [
              { tag: "li", children: ["Bomb, enables you to place more"] },
              { tag: "li", children: ["Fuel, increases the blast radius"] },
              { tag: "li", children: ["Speed, increses the walking speed"] },
            ],
          },
          {
            tag: "p",
            children: ["Will you be the last immortal standing?"],
          },
        ],
      },
    ],
  };
}
