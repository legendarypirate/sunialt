require('dotenv').config();
const sequelize = require('../config/database');

const statements = [
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url VARCHAR(255)`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_label VARCHAR(255) DEFAULT 'Дасгалын бичлэг'`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS description TEXT`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS primary_muscles TEXT`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS secondary_muscles TEXT`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS muscle_image_url VARCHAR(255)`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS why_points TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS how_points TEXT[] DEFAULT ARRAY[]::TEXT[]`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS beginner_plan VARCHAR(255) DEFAULT '3 × 8'`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS standard_plan VARCHAR(255) DEFAULT '3 × 12'`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS advanced_plan VARCHAR(255) DEFAULT '4 × 15'`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS rest_note VARCHAR(255) DEFAULT 'Амралт: сет хооронд 45–60 сек'`,
  `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS mistakes TEXT[] DEFAULT ARRAY[]::TEXT[]`,
];

async function migrate() {
  await sequelize.authenticate();
  for (const sql of statements) {
    await sequelize.query(sql);
  }
  console.log('Exercise intro columns migrated');
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
