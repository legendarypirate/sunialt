require('dotenv').config();
const { sequelize } = require('../models');
const { migrate: migrateExerciseIntro } = require('./migrateExerciseIntro');

async function sync() {
  try {
    await sequelize.authenticate();
    await migrateExerciseIntro();
    await sequelize.sync({ alter: true });
    console.log('Database synced');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err.message);
    process.exit(1);
  }
}

sync();
