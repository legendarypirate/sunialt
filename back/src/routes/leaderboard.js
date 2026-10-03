const express = require('express');
const { WorkoutSession, User, Challenge } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');
const { startOfDay, buildRepLeaderboard, challengeLeaderboard } = require('../services/stats');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/challenge/:id', async (req, res) => {
  try {
    const challenge = await Challenge.findByPk(req.params.id, {
      attributes: ['id', 'name', 'kind', 'isActive'],
    });
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const leaderboard = await challengeLeaderboard(
      { WorkoutSession, User },
      challenge,
    );

    res.json({
      challenge,
      leaderboard,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

    const leaderboard = await buildRepLeaderboard(
      { WorkoutSession, User },
      { start, limit: 50, includeSessions: true },
    );

    res.json({
      period,
      leaderboard,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
