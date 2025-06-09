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
    console.error("❌ Failed to fetch commander image", e);
    return '';
  }
}

function setupSocket(playerName, commanderName, commanderImage) {
  socket.on('gameCreated', (data) => {
    gameCode = data.gameCode;
    const name = prompt("Enter your name:");
    const commander = prompt("Enter your commander's name:");
    if (!name || !commander) return alert("Both name and commander are required.");
    fetchCommanderImage(commander).then(image => {
      socket.emit('join', {
        gameCode,
        name,
        commanderName: commander,
        commanderImage: image
      });
    });
  });

  socket.on('joined', (data) => {
    myId = data.playerId;
    gameCode = data.gameCode;
    showGameScreen();
  });

  socket.on('players', (data) => {
    const yourDiv = document.getElementById('yourCommander');
const othersDiv = document.getElementById('otherCommanders');

yourDiv.innerHTML = '';
othersDiv.innerHTML = '';

data.players.forEach(p => {
  const imgHTML = p.commanderImage
    ? `<img src="${p.commanderImage}" alt="${p.commanderName}" title="${p.name}: ${p.commanderName}" />`
    : '';

  if (p.id === myId) {
    yourDiv.innerHTML = `
      <h3>${p.name} (You)</h3>
      ${imgHTML}
      <p>Life: ${p.life}</p>
    `;
    myLife = p.life;
  } else {
    othersDiv.innerHTML += `
      <div>
        <div><strong>${p.name}</strong></div>
        ${imgHTML}
        <div>Life: ${p.life}</div>
      </div>
    `;
  }
});

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
  const name = document.getElementById('playerName').value.trim();
  const commander = document.getElementById('commanderName').value.trim();

  if (!name || !commander) {
    alert("Please enter both your name and your commander's name.");
    return;
  }

  socket = io('https://mtg-life-tracker-production.up.railway.app');
  setupSocket(name, commander); // Will fetch image after game is created
  socket.emit('create');
}

async function handleJoinGame() {
  const code = document.getElementById('joinCode').value.trim().toUpperCase();
  const name = document.getElementById('playerName').value.trim();
  const commander = document.getElementById('commanderName').value.trim();

  if (!code || !name || !commander) {
    alert("Please enter game code, your name, and your commander's name.");
    return;
  }

  const image = await fetchCommanderImage(commander);

  socket = io('https://mtg-life-tracker-production.up.railway.app');
  setupSocket(name, commander, image);
  socket.emit('join', {
    gameCode: code,
    name,
    commanderName: commander,
    commanderImage: image
  });
}

window.handleCreateGame = handleCreateGame;
window.handleJoinGame = handleJoinGame;
