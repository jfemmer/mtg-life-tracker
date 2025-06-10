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

function setupSocket(playerName, commanderName, commanderImage) {
  socket.on('gameCreated', (data) => {
    gameCode = data.gameCode;
    socket.emit('join', {
      gameCode,
      name: playerName,
      commanderName,
      commanderImage
    });

    // Fallback: force show game screen after 1s in case 'joined' isn't emitted
    setTimeout(() => {
      if (document.getElementById('game').style.display === 'none') {
        showGameScreen();
      }
    }, 1000);
  });

  socket.on('joined', (data) => {
    myId = data.playerId;
    gameCode = data.gameCode;

    const me = data.player;
    if (me) {
      document.getElementById('yourCommanderSpotlight').innerHTML = commanderHtml(me);
    }

    showGameScreen();
  });

  socket.on('players', (data) => {
    const others = data.players.filter(p => p.id !== myId);
    const me = data.players.find(p => p.id === myId);

    if (me) {
      myLife = me.life;
      document.getElementById('yourCommanderSpotlight').innerHTML = commanderHtml(me);
    }

    const commanderImgs = others.map(p => commanderHtml(p)).join('');
    document.getElementById('otherCommanders').innerHTML = commanderImgs;
  });
}

function commanderHtml(p) {
  const isDead = p.life <= 0;
  return `
    <div class="commander-spotlight">
      <h3>${p.name} (${p.commanderName})</h3>
      <div class="commander-container${isDead ? ' dead' : ''}">
        <img src="${p.commanderImage}" alt="${p.commanderName}" class="commander-img" />
        <div class="life-overlay">${p.life}</div>
      </div>
    </div>
  `;
}

function changeLife(amount) {
  myLife += amount;
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
  setupSocket(playerName, commanderName, commanderImage);
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

  socket.on('connect', () => {
    setupSocket(playerName, commanderName, commanderImage);
    socket.emit('join', {
      gameCode,
      name: playerName,
      commanderName,
      commanderImage
    });

    // Fallback for join in case 'joined' isn't fired
    setTimeout(() => {
      if (document.getElementById('game').style.display === 'none') {
        showGameScreen();
      }
    }, 1000);
  });
}

window.handleCreateGame = handleCreateGame;
window.handleJoinGame = handleJoinGame;
