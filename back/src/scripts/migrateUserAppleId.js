const { sequelize } = require('../models');

async function migrate() {
  await sequelize.authenticate();

  await sequelize.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id VARCHAR(255)
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_apple_id_unique ON users(apple_id)
  `);

  console.log('User apple_id column migrated');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrate };
