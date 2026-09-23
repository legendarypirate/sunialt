require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { sequelize } = require('./models');
const { ensureAdmin } = require('./scripts/ensureAdmin');
const { migrate: migrateExerciseIntro } = require('./scripts/migrateExerciseIntro');
const { migrate: migrateProductImages } = require('./scripts/migrateProductImages');
const { migrate: migrateExerciseProfileCover } = require('./scripts/migrateExerciseProfileCover');
const { migrate: migrateUserBodyProfile } = require('./scripts/migrateUserBodyProfile');
const { attachDuelSocket } = require('./sockets/duelSocket');
const { initFirebaseAdmin } = require('./services/fcm');

const PORT = process.env.PORT || 3071;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected (sunialt)');

    await migrateExerciseIntro();
    await migrateProductImages();
    await migrateExerciseProfileCover();
    await migrateUserBodyProfile();
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synced');

    await ensureAdmin();
    initFirebaseAdmin();

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: {
        origin: (_origin, callback) => callback(null, true),
        credentials: true,
      },
      path: '/socket.io',
      maxHttpBufferSize: 5e6,
    });
    attachDuelSocket(io);

    server.listen(PORT, () => {
      console.log(`SUNIA backend running on http://localhost:${PORT}`);
      console.log(`Socket.io duel signaling on ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
