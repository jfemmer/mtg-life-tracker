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
  document.getElementById('commanderName').addEventListener('input', async (e) => {
  const query = e.target.value.trim();
  const dropdown = document.getElementById('commanderDropdown');
  dropdown.innerHTML = '';
  dropdown.style.display = 'none';

  if (query.length < 3) return;

  try {
    const res = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}+is:commander+(type:legendary+type:creature+or+type:planeswalker)+default:true&order=released&unique=cards`);
    const data = await res.json();

   if (data.data) {
  const seenNames = new Set();

  data.data.forEach(card => {
   const name = card.name.trim().toLowerCase();
      if (seenNames.has(name)) return;
      seenNames.add(name);
      
      const displayName = card.name;
      const image = card.image_uris?.small || card.card_faces?.[0]?.image_uris?.small || '';
      if (!image) return;
      
      const option = document.createElement('div');
      option.style.display = 'flex';
      option.style.alignItems = 'center';
      option.style.padding = '6px';
      option.style.cursor = 'pointer';
      option.style.borderBottom = '1px solid #333';
      
      option.innerHTML = `
        <img src="${image}" alt="${displayName}" style="width: 40px; height: auto; margin-right: 10px; border-radius: 4px;" />
        <span style="color: #fff;">${displayName}</span>
      `;
      
      option.addEventListener('click', async () => {
        document.getElementById('commanderName').value = displayName;
        dropdown.style.display = 'none';
        commanderImage = await fetchCommanderImage(displayName);
      });
      
      dropdown.appendChild(option);
  });

  if (dropdown.children.length > 0) {
    dropdown.style.display = 'block';
  }
}
  } catch (err) {
    console.error("❌ Scryfall fetch failed", err);
  }
});

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
  });

  socket.on('joined', (data) => {
    myId = data.playerId;
    gameCode = data.gameCode;

    const me = data.player;
    if (me) {
      document.getElementById('yourCommander').innerHTML = `
      <div class="commander-spotlight">
        <div class="commander-container${me.life <= 0 ? ' dead' : ''}">
          <img src="${me.commanderImage}" alt="${me.commanderName}" class="commander-img" />
          ${me.life > 0 ? `<div class="life-overlay">${me.life}</div>` : ''}
          ${me.life <= 0 ? `<div class="skull-overlay your-skull"></div>` : ''}
          <div id="commanderTaxBadge" class="tax-badge">Tax: $${window.commanderTax || 0}</div>
        </div>
      </div>
    `;
    }

    showGameScreen();
  });

  socket.on('players', (data) => {
    const others = data.players.filter(p => p.id !== myId);
    const me = data.players.find(p => p.id === myId);

    if (me) {
  myLife = me.life;
  if (!window.commanderTax) window.commanderTax = 0;

document.getElementById('yourCommander').innerHTML = `
  <div class="commander-spotlight">
    <div class="commander-container${me.life <= 0 ? ' dead' : ''}">
      <img src="${me.commanderImage}" alt="${me.commanderName}" class="commander-img" />
      ${me.life > 0 ? `<div class="life-overlay">${me.life}</div>` : ''}
      ${me.life <= 0 ? `<div class="skull-overlay your-skull"></div>` : ''}
    </div>
  </div>
`;

setTimeout(() => {
  const btn = document.getElementById('commanderTaxBtn');
  const display = document.getElementById('commanderTaxBadge');
  if (btn && display) {
    btn.onclick = () => {
      window.commanderTax += 2;
      display.textContent = `Tax: $${window.commanderTax}`;
    };
  }
}, 100); // wait for DOM render
}

    const commanderImgs = others.map(p => {
  const isDead = p.life <= 0;
  return `
    <div class="commander-wrapper">
      <div class="player-label">${p.name}</div>
      <div class="commander-container${isDead ? ' dead' : ''}">
        <img src="${p.commanderImage}" alt="${p.commanderName || 'Commander'}"
            title="${p.name}: ${p.commanderName || 'Unknown Commander'}"
            class="commander-img" />
        ${p.life > 0 ? `<div class="life-overlay">${p.life}</div>` : ''}
        ${isDead ? `<div class="skull-overlay"></div>` : ''}
      </div>
    </div>
  `;
}).join('');
    document.getElementById('otherCommanders').innerHTML = commanderImgs;
  });
}

function changeLife(amount) {
  const newLife = myLife + amount;
  if (newLife < 0) return;

  myLife = newLife;
  console.log(`Life changed to ${myLife}`);
  socket.emit('updateLife', { life: myLife });
}

function showGameScreen() {
  document.getElementById('setup').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('gameCodeDisplay').textContent = gameCode;
  document.getElementById('minus').disabled = false;
  document.getElementById('plus').disabled = false;
  window.commanderTax = 0;
  const taxBtn = document.getElementById('commanderTaxBtn');
  const taxDisplay = document.getElementById('commanderTaxDisplay');
  
  if (taxBtn && taxDisplay) {
    taxBtn.onclick = () => {
      window.commanderTax += 2;
      const badge = document.getElementById('commanderTaxBadge');
      if (badge) badge.textContent = `Tax: $${window.commanderTax}`;
    };
  }
    
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
  setupSocket(playerName, commanderName, commanderImage);
  socket.emit('join', {
    gameCode,
    name: playerName,
    commanderName,
    commanderImage
  });

  // ⬇️ Fallback to show the game screen if 'joined' event doesn't fire
  setTimeout(() => {
    const alreadyVisible = document.getElementById('game').style.display === 'block';
    if (!alreadyVisible) {
      showGameScreen();
    }
  }, 1000); // 1 second delay as buffer
}

window.handleCreateGame = handleCreateGame;
window.handleJoinGame = handleJoinGame;
