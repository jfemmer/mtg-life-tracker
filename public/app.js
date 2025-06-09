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
  if (!gameCode || !name) {
  alert('Missing game code or name.');
  return;
}

  socket = new WebSocket('ws://localhost:3000'); // or your deployed URL
  socket.onopen = () => {
    console.log(`Joining game ${code} as ${name}`);
    socket.send(JSON.stringify({ type: 'join', gameCode: code, name }));
  };
  setupSocket();
}

function setupSocket(playerName = '') {
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Socket message:', data);

    if (data.type === 'gameCreated') {
      gameCode = data.gameCode;

      if (!playerName) {
        alert('Missing name for creator.');
        return;
      }

      socket.send(JSON.stringify({ type: 'join', gameCode, name: playerName }));
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
