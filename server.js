import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { nanoid } from 'nanoid';

const app = express();
app.use(cors({
  origin: ['https://jfemmer.github.io'],
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['https://jfemmer.github.io'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const games = {};

io.on('connection', (socket) => {
  let gameCode = null;
  const playerId = nanoid();

  socket.on('create', () => {
    gameCode = nanoid(6).toUpperCase();
    games[gameCode] = { players: [] };
    socket.emit('gameCreated', { gameCode });
  });

socket.on('join', ({ gameCode: code, name, commanderName, commanderImage }) => {
  gameCode = code;
  const player = { id: playerId, name, life: 40, commanderName, commanderImage };

  if (!games[gameCode]) games[gameCode] = { players: [] };
  games[gameCode].players.push(player);

  socket.join(gameCode);
  socket.emit('joined', { playerId, gameCode, player }); // ✅ include `player` here
  io.to(gameCode).emit('players', { players: games[gameCode].players });
});


  socket.on('updateLife', ({ life }) => {
    const game = games[gameCode];
    if (!game) return;
    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.life = life;
      io.to(gameCode).emit('players', { players: game.players });
    }
  });

  socket.on('disconnect', () => {
    if (gameCode && games[gameCode]) {
      games[gameCode].players = games[gameCode].players.filter(p => p.id !== playerId);
      io.to(gameCode).emit('players', { players: games[gameCode].players });
    }
  });
});

app.get('/', (req, res) => {
  res.send('MTG Life Tracker backend is running');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server listening on port ${PORT}`);
})
