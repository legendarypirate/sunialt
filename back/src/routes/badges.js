const express = require('express');
const { Badge } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', async (_req, res) => {
  try {
    const badges = await Badge.findAll({ order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
    res.json({ badges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const badge = await Badge.create(req.body);
    res.status(201).json({ badge });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const badge = await Badge.findByPk(req.params.id);
    if (!badge) return res.status(404).json({ error: 'Badge not found' });
    await badge.update(req.body);
    res.json({ badge });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const badge = await Badge.findByPk(req.params.id);
    if (!badge) return res.status(404).json({ error: 'Badge not found' });
    await badge.destroy();
    res.json({ message: 'Badge deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
