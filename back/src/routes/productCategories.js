const express = require('express');
const { ProductCategory, Product } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', async (_req, res) => {
  try {
    const categories = await ProductCategory.findAll({
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json({ categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const category = await ProductCategory.create(req.body);
    res.status(201).json({ category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const prevName = category.name;
    await category.update(req.body);

    if (req.body.name && req.body.name !== prevName) {
      await Product.update(
        { category: category.name },
        { where: { categoryId: category.id } },
      );
    }

    res.json({ category });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await ProductCategory.findByPk(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const inUse = await Product.count({ where: { categoryId: category.id } });
    if (inUse > 0) {
      return res.status(400).json({ error: 'Энэ ангилалд бүтээгдэхүүн байна. Эхлээд шилжүүлнэ үү.' });
    }

    await category.destroy();
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
