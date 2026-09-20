const express = require('express');
const { User, Workout, Challenge, Product, Exercise, WorkoutSession } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/stats', async (_req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      plusSubscribers,
      totalWorkouts,
      totalExercises,
      activeChallenges,
      totalProducts,
      totalSessions,
      totalReps,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { isActive: true } }),
      User.count({ where: { isPlusSubscriber: true } }),
      Workout.count({ where: { isPublished: true } }),
      Exercise.count({ where: { isPublished: true } }),
      Challenge.count({ where: { isActive: true } }),
      Product.count({ where: { isPublished: true } }),
      WorkoutSession.count(),
      WorkoutSession.sum('repCount'),
    ]);

    const recentUsers = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      attributes: ['id', 'displayName', 'email', 'createdAt', 'streakDays', 'isPlusSubscriber', 'totalPushUps'],
    });

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        plusSubscribers,
        totalWorkouts,
        totalExercises,
        activeChallenges,
        totalProducts,
        totalSessions,
        totalReps: totalReps || 0,
      },
      recentUsers,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
