import { io } from 'https://cdn.socket.io/4.7.2/socket.io.esm.min.js';

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

  socket.on('connect', () => {
    console.log('🔌 Connected via Socket.IO');
    socket.emit('create');

    socket.once('gameCreated', (data) => {
      gameCode = data.gameCode;
      socket.emit('join', { gameCode, name: playerName });
    });

    setupSocket(playerName);
  });
}

function joinGame(code, playerName) {
  socket = io('https://mtg-life-tracker-production.up.railway.app');

  socket.on('connect', () => {
    console.log(`Joining game ${code} as ${playerName}`);
    socket.emit('join', { gameCode: code, name: playerName });
    setupSocket(playerName);
  });
}

function setupSocket(playerName = '') {
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

function showGameScreen() {
  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('gameCodeDisplay').textContent = gameCode;
  document.getElementById('minus').disabled = false;
  document.getElementById('plus').disabled = false;
}

function changeLife(amount) {
  myLife += amount;
  console.log(`Life changed to ${myLife}`);
  socket.emit('updateLife', { life: myLife });
}

window.handleCreateGame = function () {
  const name = prompt("Enter your name:");
  if (name) createGame(name.trim());
};

window.handleJoinGame = function () {
  const code = prompt("Enter game code:");
  const name = prompt("Enter your name:");
  if (code && name) joinGame(code.trim().toUpperCase(), name.trim());
};
