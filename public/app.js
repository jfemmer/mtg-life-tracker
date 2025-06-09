import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';

let socket;
let myId = null;
let myLife = 40;
let gameCode = null;
let playerName = '';
let commanderName = '';
let commanderImage = '';

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
    console.error("❌ Failed to fetch commander image", e);
    return '';
  }
}

function setupSocket() {
  socket.on('gameCreated', (data) => {
    gameCode = data.gameCode;
    socket.emit('join', {
      gameCode,
      name: playerName,
      commanderName,
      commanderImage
    });
  });

  socket.on('joined', (data) => {
    myId = data.playerId;
    gameCode = data.gameCode;
    showGameScreen();
  });

socket.on('players', (data) => {
  const spotlight = document.getElementById('yourCommanderSpotlight');
  const othersDiv = document.getElementById('otherCommanders');

  spotlight.innerHTML = '';
  othersDiv.innerHTML = '';

  console.log('Players received:', data.players); // 🔍 Debug image presence

  data.players.forEach(p => {
    const imageMarkup = p.commanderImage
      ? `<img src="${p.commanderImage}" alt="${p.commanderName || 'Commander'}" title="${p.commanderName || 'Commander'}" />`
      : `<div style="color: #888; font-size: 0.9rem;">No image available</div>`;

    if (p.id === myId) {
      spotlight.innerHTML = `
        <h3>${p.name} (You)</h3>
        ${imageMarkup}
        <p>Life: ${p.life}</p>
      `;
      myLife = p.life;
    } else {
      const otherCard = document.createElement('div');
      otherCard.innerHTML = `
        <div><strong>${p.name}</strong></div>
        ${imageMarkup}
        <div>Life: ${p.life}</div>
      `;
      othersDiv.appendChild(otherCard);
    }
  });

  const me = data.players.find(p => p.id === myId);
  if (me) myLife = me.life;
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

async function handleCreateGame() {
  playerName = document.getElementById('playerName').value.trim();
  commanderName = document.getElementById('commanderName').value.trim();

  if (!playerName || !commanderName) {
    alert("Please enter both your name and your commander's name.");
    return;
  }

  commanderImage = await fetchCommanderImage(commanderName);

  socket = io('https://mtg-life-tracker-production.up.railway.app');
  setupSocket();
  socket.emit('create');
}

async function handleJoinGame() {
  gameCode = document.getElementById('joinCode').value.trim().toUpperCase();
  playerName = document.getElementById('playerName').value.trim();
  commanderName = document.getElementById('commanderName').value.trim();

  if (!gameCode || !playerName || !commanderName) {
    alert("Please enter game code, your name, and your commander's name.");
    return;
  }

  commanderImage = await fetchCommanderImage(commanderName);

  socket = io('https://mtg-life-tracker-production.up.railway.app');
  setupSocket();
  socket.emit('join', {
    gameCode,
    name: playerName,
    commanderName,
    commanderImage
  });
}

window.handleCreateGame = handleCreateGame;
window.handleJoinGame = handleJoinGame;
