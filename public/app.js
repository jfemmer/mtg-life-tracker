let socket;
let myId = null;
let myLife = 40;
let gameCode = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('minus').onclick = () => changeLife(-1);
  document.getElementById('plus').onclick = () => changeLife(1);
});

function createGame(name) {
  socket = new WebSocket('ws://localhost:3000'); // or your Railway URL
  socket.onopen = () => {
    console.log('Creating game...');
    socket.send(JSON.stringify({ type: 'create' }));
  };
  setupSocket();
}

function joinGame(gameCode, name) {
  const code = document.getElementById('gameCodeInput').value.trim().toUpperCase();
  const name = document.getElementById('nameInput').value.trim();

  if (!code || !name) {
    alert('Please enter both a game code and your name.');
    return;
  }

  socket = new WebSocket('ws://localhost:3000'); // or your deployed URL
  socket.onopen = () => {
    console.log(`Joining game ${code} as ${name}`);
    socket.send(JSON.stringify({ type: 'join', gameCode: code, name }));
  };
  setupSocket();
}

function setupSocket() {
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Socket message:', data);

    if (data.type === 'gameCreated') {
      gameCode = data.gameCode;

      // 👇 Grab name and immediately join as creator
      const name = document.getElementById('nameInput').value.trim();
      if (!name) {
        alert('Enter your name before creating a game.');
        return;
      }

      socket.send(JSON.stringify({ type: 'join', gameCode, name }));
    }

    if (data.type === 'joined') {
      myId = data.playerId;
      gameCode = data.gameCode;
      showGameScreen();
    }

    if (data.type === 'players') {
      const playersDiv = document.getElementById('players');
      playersDiv.innerHTML = data.players.map(p => `
        <p><strong>${p.name}</strong>: ${p.life} ${p.id === myId ? "(You)" : ""}</p>
      `).join('');

      const me = data.players.find(p => p.id === myId);
      if (me) {
        myLife = me.life;
      }
    }
  };
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
  socket.send(JSON.stringify({ type: 'updateLife', life: myLife }));
}
