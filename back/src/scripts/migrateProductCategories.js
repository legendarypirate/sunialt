const { sequelize, ProductCategory } = require('../models');

const DEFAULT_CATEGORIES = [
  { name: 'Суниалтын төхөөрөмж', slug: 'gear', icon: 'fitness_center', sortOrder: 1 },
  { name: 'Дагалдах хэрэгсэл', slug: 'accessory', icon: 'sports_gymnastics', sortOrder: 2 },
  { name: 'Спорт хувцас', slug: 'wear', icon: 'checkroom_outlined', sortOrder: 3 },
  { name: 'Нэмэлт бордоо', slug: 'supplement', icon: 'local_drink_outlined', sortOrder: 4 },
];

async function migrate() {
  await sequelize.authenticate();

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      icon VARCHAR(64) DEFAULT 'category',
      sort_order INTEGER DEFAULT 0,
      is_published BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await sequelize.query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES product_categories(id)
  `);

  for (const row of DEFAULT_CATEGORIES) {
    const [category] = await ProductCategory.findOrCreate({
      where: { slug: row.slug },
      defaults: row,
    });
    await sequelize.query(
      `
      UPDATE products
      SET category_id = :categoryId, category = :categoryName
      WHERE category_id IS NULL AND category = :categoryName
      `,
      {
        replacements: {
          categoryId: category.id,
          categoryName: category.name,
        },
      },
    );
  }

  const categories = await ProductCategory.findAll();
  const byName = Object.fromEntries(categories.map((c) => [c.name, c]));
  const fallback = categories[0];

  const [products] = await sequelize.query(`
    SELECT id, category FROM products WHERE category_id IS NULL
  `);

  for (const product of products) {
    const match = byName[product.category] || fallback;
    if (match) {
      await sequelize.query(
        `
        UPDATE products
        SET category_id = :categoryId, category = :categoryName
        WHERE id = :id
        `,
        {
          replacements: {
            categoryId: match.id,
            categoryName: match.name,
            id: product.id,
          },
        },
      );
    }
  }

  console.log('Product categories migrated');
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrate, DEFAULT_CATEGORIES };
