const express = require('express');
const { Product, ProductCategory } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');
const { normalizeProductImages, withProductImages } = require('../utils/productImages');

const router = express.Router();
router.use(authenticateAdmin);

async function withCategoryFields(body) {
  const data = normalizeProductImages({ ...body });
  if (data.categoryId) {
    const category = await ProductCategory.findByPk(data.categoryId);
    if (category) {
      data.category = category.name;
    }
  }
  return data;
}

function formatAdminProduct(product) {
  const json = withProductImages(product);
  const cat = product.productCategory;
  return {
    ...json,
    category: cat?.name || json.category,
    categoryId: json.categoryId || cat?.id || null,
  };
}

router.get('/', async (_req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: ProductCategory, as: 'productCategory', required: false }],
      order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']],
    });
    res.json({ products: products.map(formatAdminProduct) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const product = await Product.create(await withCategoryFields(req.body));
    await product.reload({ include: [{ model: ProductCategory, as: 'productCategory' }] });
    res.status(201).json({ product: formatAdminProduct(product) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: ProductCategory, as: 'productCategory', required: false }],
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product: formatAdminProduct(product) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await product.update(await withCategoryFields(req.body));
    await product.reload({ include: [{ model: ProductCategory, as: 'productCategory' }] });
    res.json({ product: formatAdminProduct(product) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    await product.destroy();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
