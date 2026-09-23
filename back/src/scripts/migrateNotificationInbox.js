const { sequelize } = require('../models');

async function migrate() {
  await sequelize.authenticate();
  await sequelize.query(
    `ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS type VARCHAR(32) DEFAULT 'system'`,
  );
  await sequelize.query(
    `ALTER TABLE notification_logs ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE`,
  );
  console.log('Notification inbox columns migrated');
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
