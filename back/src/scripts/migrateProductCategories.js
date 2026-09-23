const { sequelize, Product, ProductCategory } = require('../models');

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
    await Product.update(
      { categoryId: category.id, category: category.name },
      {
        where: {
          categoryId: null,
          category: category.name,
        },
      },
    );
  }

  const categories = await ProductCategory.findAll();
  const byName = Object.fromEntries(categories.map((c) => [c.name, c]));
  const fallback = categories[0];

  const products = await Product.findAll({ where: { categoryId: null } });
  for (const product of products) {
    const match = byName[product.category] || fallback;
    if (match) {
      await product.update({
        categoryId: match.id,
        category: match.name,
      });
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
