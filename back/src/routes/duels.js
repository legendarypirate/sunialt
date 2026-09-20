const express = require('express');
const { Duel, User } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', async (req, res) => {
  try {
    const duels = await Duel.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'displayName', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json({ duels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
