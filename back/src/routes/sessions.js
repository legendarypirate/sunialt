const express = require('express');
const { WorkoutSession, User, Exercise } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (page - 1) * limit;
    const { count, rows } = await WorkoutSession.findAndCountAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'displayName', 'email'] },
        { model: Exercise, as: 'exercise', attributes: ['id', 'title'] },
      ],
      order: [['completedAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      sessions: rows,
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const session = await WorkoutSession.findByPk(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    await session.destroy();
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
