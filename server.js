import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const games = {}; // gameCode -> { players: [...] }

io.on('connection', (socket) => {
  let gameCode = null;
  const playerId = nanoid();

  console.log('⚡ New client connected:', playerId);

  socket.on('create', () => {
    gameCode = nanoid(6).toUpperCase();
    games[gameCode] = { players: [] };
    socket.emit('gameCreated', { gameCode });
  });

  socket.on('join', ({ gameCode: code, name }) => {
    gameCode = code;
    const player = { id: playerId, name, life: 40 };

    if (!games[gameCode]) {
      games[gameCode] = { players: [] };
    }

    games[gameCode].players.push(player);
    socket.emit('joined', { playerId, gameCode });
    broadcastPlayers(gameCode);
  });

  socket.on('updateLife', ({ life }) => {
    const game = games[gameCode];
    if (!game) return;
    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.life = life;
      broadcastPlayers(gameCode);
    }
  });

  socket.on('disconnect', () => {
    if (gameCode && games[gameCode]) {
      games[gameCode].players = games[gameCode].players.filter(p => p.id !== playerId);
      broadcastPlayers(gameCode);
    }
  });

  function broadcastPlayers(code) {
    io.emit('players', { players: games[code].players });
  }
});

app.get('/', (req, res) => {
  res.send('Socket.IO MTG Life Tracker backend is running');
});

server.listen(process.env.PORT || 3000, () =>
  console.log('✅ Socket.IO server running')
);
