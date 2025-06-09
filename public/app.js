import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';

let socket;
let myId = null;
let myLife = 40;
let gameCode = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('minus').onclick = () => changeLife(-1);
  document.getElementById('plus').onclick = () => changeLife(1);
});

async function fetchCommanderImage(name) {
  try {
    const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`);
    const data = await res.json();
    return data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || '';
  } catch (e) {
    console.error("Failed to fetch commander image", e);
    return '';
  }
}

async function createGame(playerName, commanderName) {
  const commanderImage = await fetchCommanderImage(commanderName);
  socket = io('https://mtg-life-tracker-production.up.railway.app');
  setupSocket(playerName, commanderName, commanderImage);
  socket.emit('create');
}

async function joinGame(code, playerName, commanderName) {
  if (!code || !playerName) {
    alert('Missing game code or name.');
    return;
  }
  const commanderImage = await fetchCommanderImage(commanderName);
  socket = io('https://mtg-life-tracker-production.up.railway.app');
  setupSocket(playerName, commanderName, commanderImage);
  socket.emit('join', { gameCode: code, name: playerName, commanderName, commanderImage });
}

function setupSocket(playerName, commanderName, commanderImage) {
  socket.on('gameCreated', (data) => {
    gameCode = data.gameCode;
    socket.emit('join', { gameCode, name: playerName, commanderName, commanderImage });
  });

  socket.on('joined', (data) => {
    myId = data.playerId;
    gameCode = data.gameCode;
    showGameScreen();
  });

  socket.on('players', (data) => {
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = data.players.map(p => `
      <div style="margin-bottom: 10px;">
        <p><strong>${p.name}</strong>: ${p.life} ${p.id === myId ? "(You)" : ""}</p>
        ${p.commanderImage ? `<img src="${p.commanderImage}" alt="${p.commanderName}" width="100" style="border-radius: 8px;" />` : ""}
      </div>
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

function handleCreateGame() {
  const name = prompt("Enter your name:");
  const commander = prompt("Enter your commander's name:");
  if (name && commander) createGame(name, commander);
}

function handleJoinGame() {
  const code = prompt("Enter game code:");
  const name = prompt("Enter your name:");
  const commander = prompt("Enter your commander's name:");
  if (code && name && commander) joinGame(code, name, commander);
}

window.createGame = createGame;
window.joinGame = joinGame;
window.handleCreateGame = handleCreateGame;
window.handleJoinGame = handleJoinGame;
