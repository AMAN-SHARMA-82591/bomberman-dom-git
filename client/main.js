import { emit } from "../framework/index.js";
import { sendMessage, error } from "./ws.js";
import { gameEnded, gameStarted, updateGameStarted } from "./logic.js";

export function Main() {
  console.log('Main component loaded');
  if (gameEnded) {
    updateGameStarted(false); // Reset gameStarted state
  }

  let nickname = '';

  const user = JSON.parse(localStorage.getItem('user'));

  document.getElementById('background-video').style.display = 'block';
  const bgMusic = document.getElementById('background-music');
  if (bgMusic) {
    bgMusic.play();
  }

return {
  tag: 'div',
  attrs: {},
  children: [
    {
      tag: 'h1',
      attrs: {
        id: 'title'
      },
      children: ['Twilight Inferno']
    },
    {
      tag: 'p',
      attrs: {
        id: 'info-text'
      },
      children: ['Twilight falls, the arena ignites… enter your name to join the fight.']
    },
    {
      tag: 'button',
      attrs: {
        id: 'music-btn',
        onclick: () => {
          const audio = document.getElementById('background-music');
          const btn = document.getElementById('music-btn');
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
        }
      },
      children: [' '] 
    },
    {
      tag: 'input',
      attrs: {
        id: 'nickname-input',
        placeholder: 'Enter nickname',
        value: nickname || ''
      },
      children: []
    },
    {
      tag: 'button',
      attrs: {
        id: 'join-btn',
        disabled: gameStarted,
        onclick: () => {
          nickname = document.getElementById('nickname-input').value.trim();
          if (!nickname) {
            emit('showError', 'Nickname cannot be empty');
            return;
          }
          sendMessage({ type: 'join', nickname });
        }
      },
      children: ['Join Game']
    },
    {
      tag: 'p',
      attrs: {
        id: 'error',
      },
      children: [error || '']
    },
  ]
};
}
