const { sequelize } = require('../models');

async function migrate() {
  await sequelize.authenticate();
  await sequelize.query(
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at DATE`,
  );
  console.log('User subscription_started_at column migrated');
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
