const express = require('express');
const { Challenge } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', async (_req, res) => {
  try {
    const challenges = await Challenge.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ challenges });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const challenge = await Challenge.create(req.body);
    res.status(201).json({ challenge });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    res.json({ challenge });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    await challenge.update(req.body);
    res.json({ challenge });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findByPk(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    await challenge.destroy();
    res.json({ message: 'Challenge deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
