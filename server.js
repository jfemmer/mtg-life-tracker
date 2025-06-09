import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { nanoid } from 'nanoid';

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const games = {}; // gameCode -> { players: [...] }

wss.on('connection', (ws) => {
  let gameCode = null;
  const playerId = nanoid();

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);

    if (data.type === 'create') {
      gameCode = nanoid(6).toUpperCase();
      games[gameCode] = { players: [] };
      ws.send(JSON.stringify({ type: 'gameCreated', gameCode }));
    }

    if (data.type === 'join') {
      gameCode = data.gameCode;
      const player = { id: playerId, name: data.name, life: 40 };
      if (!games[gameCode]) {
        games[gameCode] = { players: [] };
      }
      games[gameCode].players.push(player);
      ws.send(JSON.stringify({ type: 'joined', playerId, gameCode }));
      broadcast(gameCode);
    }

    if (data.type === 'updateLife') {
      const game = games[gameCode];
      if (!game) return;
      const player = game.players.find(p => p.id === playerId);
      if (player) {
        player.life = data.life;
        broadcast(gameCode);
      }
    }
  });

  ws.on('close', () => {
    if (gameCode && games[gameCode]) {
      games[gameCode].players = games[gameCode].players.filter(p => p.id !== playerId);
      broadcast(gameCode);
    }
  });

  function broadcast(code) {
    const message = JSON.stringify({ type: 'players', players: games[code].players });
    wss.clients.forEach(client => {
      if (client.readyState === ws.OPEN) {
        client.send(message);
      }
    });
  }
});

server.listen(process.env.PORT || 3000, () =>
  console.log('✅ WebSocket server running')
);
