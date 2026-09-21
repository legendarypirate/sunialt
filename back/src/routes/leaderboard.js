const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const { WorkoutSession, User } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');
const { startOfDay } = require('../services/stats');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', async (req, res) => {
  try {
    const period = req.query.period || 'daily';
    const now = new Date();
    let start = startOfDay(now);
    if (period === 'weekly') {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (period === 'all') {
      start = new Date('2000-01-01');
    }

    const rows = await WorkoutSession.findAll({
      attributes: [
        'userId',
        [fn('SUM', col('rep_count')), 'score'],
        [fn('COUNT', col('WorkoutSession.id')), 'sessions'],
      ],
      where: { completedAt: { [Op.gte]: start } },
      include: [{ model: User, as: 'user', attributes: ['id', 'displayName', 'email'] }],
      group: ['WorkoutSession.user_id', 'user.id', 'user.display_name', 'user.email'],
      order: [[literal('SUM(rep_count)'), 'DESC']],
      limit: 50,
    });

    res.json({
      period,
      leaderboard: rows.map((row, index) => {
        const json = row.toJSON();
        return {
          rank: index + 1,
          userId: json.userId,
          name: json.user?.displayName || 'Хэрэглэгч',
          email: json.user?.email,
          score: Number(json.score),
          sessions: Number(json.sessions),
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
