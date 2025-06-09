import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';

let socket;
let myId = null;
let myLife = 40;
let gameCode = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('minus').onclick = () => changeLife(-1);
  document.getElementById('plus').onclick = () => changeLife(1);
});

function createGame(playerName) {
  socket = io('https://mtg-life-tracker-production.up.railway.app');
  setupSocket(playerName);

  socket.emit('create');
}

function joinGame(code, playerName) {
  if (!code || !playerName) {
    alert('Missing game code or name.');
    return;
  }

  socket = io('https://mtg-life-tracker-production.up.railway.app');
  setupSocket(playerName);

  socket.emit('join', { gameCode: code, name: playerName });
}

function setupSocket(playerName) {
  socket.on('gameCreated', (data) => {
    gameCode = data.gameCode;
    socket.emit('join', { gameCode, name: playerName });
  });

  socket.on('joined', (data) => {
    myId = data.playerId;
    gameCode = data.gameCode;
    showGameScreen();
  });

  socket.on('players', (data) => {
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = data.players.map(p => `
      <p><strong>${p.name}</strong>: ${p.life} ${p.id === myId ? "(You)" : ""}</p>
    `).join('');

    const me = data.players.find(p => p.id === myId);
    if (me) {
      myLife = me.life;
    }
  });
}

function changeLife(amount) {
  myLife += amount;
  console.log(`Life changed to ${myLife}`);
  socket.emit('updateLife', { life: myLife });
}

function showGameScreen() {
  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('gameCodeDisplay').textContent = gameCode;
  document.getElementById('minus').disabled = false;
  document.getElementById('plus').disabled = false;
}

// 👇 These must match your HTML onclick handlers
window.createGame = createGame;
window.joinGame = joinGame;
