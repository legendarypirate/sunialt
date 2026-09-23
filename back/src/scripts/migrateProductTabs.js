const { sequelize } = require('../models');

async function migrate() {
  await sequelize.authenticate();

  await sequelize.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS tab_description TEXT
  `);
  await sequelize.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS tab_features TEXT[] DEFAULT '{}'
  `);
  await sequelize.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS tab_size_info TEXT
  `);
  await sequelize.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS show_tab_description BOOLEAN DEFAULT true
  `);
  await sequelize.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS show_tab_features BOOLEAN DEFAULT true
  `);
  await sequelize.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS show_tab_size BOOLEAN DEFAULT true
  `);

  console.log('Product tab columns migrated');
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
