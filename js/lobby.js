import { sendMessage } from "./ws.js";
import { Chat } from "./chat.js";

const user = JSON.parse(localStorage.getItem('user'));

if (!user) {
  window.location.hash= '/';
  // setState({ page: '/' });
} else {
  const page = window.location.hash.replace("#", ""); // removes the '#' char

  sendMessage({ type: 'pageReload', id: user.id, page });
}

export function Lobby() {
  const user = JSON.parse(localStorage.getItem('user'));
  if (!user) {
    // setState({ page: '/' });
    window.location.hash = '/';
    return;
  }
  const nickname = user.nickname;
  const playerID = user.id;

  return {
    tag: 'div',
    attrs: {},
    children: [
      {
        tag: 'h2',
        attrs: {},
        children: ['Lobby']
      },
      {
        tag: 'p',
        attrs: { id: 'welcome' },
        children: [`Welcome, ${nickname}!`]
      },
      {
        tag: 'p',
        attrs: { id: 'player-count' },
        children: []
      },
      // Add countdown display
      {
        tag: 'p',
        attrs: { id: 'timer', style: 'font-size: 20px; font-weight: bold; color: red;' },
        children: []
      },
      {
        tag: 'ul',
        attrs: { id: 'player-list' },
        children: []
      },
      {
        tag: 'div',
        attrs: { id: 'chat-area', class: 'collapsed' },
        children: [
          {
            tag: 'div',
            attrs: {
              id: 'chat-toggle',
              onclick: () => {
                const chatArea = document.getElementById('chat-area');
                chatArea.classList.toggle('collapsed');
                if (!chatArea.classList.contains('collapsed')) {
                  document.getElementById('chat-input').focus();
                }
              }
            },
            children: ['💬']
          },
          Chat({ playerID, nickname }) // Include Chat component
        ]
      },
      {
        tag: 'p',
        attrs: { id: 'error', style: 'color:red' },
        children: []
      }
    ]
  };
  }

