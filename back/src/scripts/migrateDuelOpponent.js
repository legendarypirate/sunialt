const { sequelize } = require('../models');

async function migrate() {
  await sequelize.authenticate();
  await sequelize.query(
    `ALTER TABLE duels ADD COLUMN IF NOT EXISTS opponent_id UUID`,
  );
  console.log('Duel opponent_id column migrated');
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
