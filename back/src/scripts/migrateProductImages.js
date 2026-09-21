require('dotenv').config();
const sequelize = require('../config/database');

async function migrate() {
  await sequelize.authenticate();
  await sequelize.query(
    `ALTER TABLE products ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  );
  await sequelize.query(`
    UPDATE products
    SET image_urls = ARRAY[image_url]
    WHERE image_url IS NOT NULL
      AND image_url <> ''
      AND (image_urls IS NULL OR cardinality(image_urls) = 0)
  `);
  console.log('Product image_urls column migrated');
}

module.exports = { migrate };

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err.message);
      process.exit(1);
    });
}
