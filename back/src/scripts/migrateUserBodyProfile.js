const { sequelize } = require('../models');

async function migrate() {
  await sequelize.authenticate();
  await sequelize.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS height_cm INTEGER DEFAULT 175`,
  );
  await sequelize.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS weight_kg INTEGER DEFAULT 72`,
  );
  await sequelize.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER DEFAULT 24`,
  );
  await sequelize.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS fitness_level VARCHAR(32) DEFAULT 'Дунд шат'`,
  );
  await sequelize.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS goal_weight_kg INTEGER DEFAULT 70`,
  );
  console.log('User body profile columns migrated');
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
