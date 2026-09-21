require('dotenv').config();
const { sequelize } = require('../models');
const { migrate: migrateExerciseIntro } = require('./migrateExerciseIntro');
const { migrate: migrateProductImages } = require('./migrateProductImages');
const { migrate: migrateExerciseProfileCover } = require('./migrateExerciseProfileCover');

async function sync() {
  try {
    await sequelize.authenticate();
    await migrateExerciseIntro();
    await migrateProductImages();
    await migrateExerciseProfileCover();
    await sequelize.sync({ alter: true });
    console.log('Database synced');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err.message);
    process.exit(1);
  }
}

sync();
