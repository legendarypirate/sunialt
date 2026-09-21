const { sequelize } = require('../models');

async function migrate() {
  await sequelize.authenticate();
  await sequelize.query(
    `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(255)`,
  );
  await sequelize.query(
    `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(255)`,
  );
  await sequelize.query(`
    UPDATE exercises
    SET cover_image_url = image_url
    WHERE image_url IS NOT NULL
      AND image_url <> ''
      AND (cover_image_url IS NULL OR cover_image_url = '')
  `);
  await sequelize.query(`
    UPDATE exercises
    SET profile_image_url = image_url
    WHERE image_url IS NOT NULL
      AND image_url <> ''
      AND (profile_image_url IS NULL OR profile_image_url = '')
  `);
  console.log('Exercise profile/cover image columns migrated');
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
