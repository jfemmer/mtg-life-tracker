import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { nanoid } from 'nanoid';

const app = express();
app.use(cors({
  origin: [
    'https://jfemmer.github.io',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://jfemmer.github.io',
      'http://localhost:5500',
      'http://127.0.0.1:5500'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const games = {};

io.on('connection', (socket) => {
  let gameCode = null;
  const playerId = nanoid();

  const allColors = [
  '#FF6B6B', '#4ECDC4', '#FFD93D', '#1A8FE3', '#A259FF',
  '#00C851', '#FF8800', '#FF66CC', '#33B5E5', '#AA66CC',
  '#669900', '#FF4444', '#0099CC', '#9933CC'
];

socket.on('create', () => {
  gameCode = nanoid(6).toUpperCase();
  games[gameCode] = {
    players: [],
    availableColors: [...allColors] // clone initial color pool
  };
  socket.emit('gameCreated', { gameCode });
});

socket.on('join', ({ gameCode: code, name, commanderName, commanderImage }) => {
  gameCode = code;
  const game = games[gameCode];

  if (!game) return;

  // Pick a random color from the pool and remove it
  const pool = game.availableColors;
  const randomIndex = Math.floor(Math.random() * pool.length);
  const assignedColor = pool.splice(randomIndex, 1)[0] || '#FFFFFF';

  const player = {
    id: playerId,
    name,
    life: 40,
    commanderName,
    commanderImage,
    poisonCount: 0,
    commanderTax: 0,
    color: assignedColor
  };

  game.players.push(player);

  socket.join(gameCode);
  socket.emit('joined', { playerId, gameCode, player });
  io.to(gameCode).emit('players', { players: game.players });
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

  socket.on('updateTax', ({ commanderTax }) => {
    const game = games[gameCode];
    if (!game) return;
    const player = game.players.find(p => p.id === playerId);
    if (player) {
      player.commanderTax = commanderTax;
      io.to(gameCode).emit('players', { players: game.players });
    }
  });

socket.on('updatePoison', ({ poisonCount }) => {
  const game = games[gameCode];
  if (!game) return;
  const player = game.players.find(p => p.id === playerId);
  if (player) {
    player.poisonCount = poisonCount;
    io.to(gameCode).emit('players', { players: game.players });
  }
});

socket.on('resetGame', () => {
  const game = games[gameCode];
  if (!game) return;

 for (const player of game.players) {
  player.life = 40;
  player.poisonCount = 0;
  player.commanderTax = 0;
}

  io.to(gameCode).emit('players', { players: game.players });
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
