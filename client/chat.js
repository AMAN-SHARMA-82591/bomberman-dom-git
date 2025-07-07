import { sendMessage } from "./ws.js";

export function Chat({ playerID, nickname }) {
  const sendChatMessage = () => {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (message) {
      sendMessage({ type: 'chat', id: playerID, nickname, message });
      input.value = '';
    }
  };

  return {
    tag: 'div',
    attrs: { id: 'chat-container' },
    children: [
      {
        tag: 'div',
        attrs: { id: 'chat' },
        children: []
      },
      {
        tag: 'input',
        attrs: {
          id: 'chat-input',
          autofocus: true,
          type: 'text',
          placeholder: 'Type your message here...',
          onkeydown: (e) => {
            if (e.key === 'Enter') {
              sendChatMessage();
            }
          }
        },
        children: []
      },
      {
        tag: 'button',
        attrs: {
          id: 'send-chat',
          onclick: sendChatMessage
        },
        children: ['Send']
      }
    ]
  };
}

