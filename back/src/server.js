require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');
const { ensureAdmin } = require('./scripts/ensureAdmin');
const { migrate: migrateExerciseIntro } = require('./scripts/migrateExerciseIntro');
const { migrate: migrateProductImages } = require('./scripts/migrateProductImages');
const { migrate: migrateExerciseProfileCover } = require('./scripts/migrateExerciseProfileCover');

const PORT = process.env.PORT || 3071;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Database connected (sunialt)');

    await migrateExerciseIntro();
    await migrateProductImages();
    await migrateExerciseProfileCover();
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Database synced');

    await ensureAdmin();

    app.listen(PORT, () => {
      console.log(`SUNIA backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
