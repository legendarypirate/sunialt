const { sequelize } = require('../models');

async function migrate() {
  await sequelize.authenticate();

  await sequelize.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id INTEGER
  `);

  await sequelize.query(`
    CREATE SEQUENCE IF NOT EXISTS users_public_id_seq
  `);

  await sequelize.query(`
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC NULLS LAST, id ASC) AS rn
      FROM users
      WHERE public_id IS NULL
    )
    UPDATE users u
    SET public_id = numbered.rn
    FROM numbered
    WHERE u.id = numbered.id
  `);

  await sequelize.query(`
    SELECT setval(
      'users_public_id_seq',
      GREATEST(COALESCE((SELECT MAX(public_id) FROM users), 0), 1)
    )
  `);

  await sequelize.query(`
    ALTER TABLE users
    ALTER COLUMN public_id SET DEFAULT nextval('users_public_id_seq')
  `);

  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_public_id_unique ON users(public_id)
  `);

  console.log('User public_id column migrated');
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
