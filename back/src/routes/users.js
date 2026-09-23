const express = require('express');
const { Op } = require('sequelize');
const { User } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');
const {
  resolvePlanId,
  buildUserSubscriptionFields,
  buildRevokedSubscriptionFields,
} = require('../services/subscriptionPlans');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const where = search
      ? {
          [Op.or]: [
            { email: { [Op.iLike]: `%${search}%` } },
            { displayName: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      users: rows,
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

router.get('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/subscription', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const planId = resolvePlanId(req.body?.plan);
    if (!planId) {
      return res.status(400).json({ error: 'Буруу төлөвлөгөө. Зөвшөөрөгдсөн: monthly, quarterly, yearly' });
    }

    const extend = req.body?.extend !== false;
    const fields = buildUserSubscriptionFields(user, planId, { extend });
    await user.update(fields);
    res.json({ user, plan: planId });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.delete('/:id/subscription', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await user.update(buildRevokedSubscriptionFields());
    res.json({ user });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const allowed = [
      'displayName', 'tagline', 'streakDays', 'workoutDays', 'completedWorkouts',
      'earnedMinutes', 'isPlusSubscriber', 'isActive', 'dailyGoalReps',
      'todayPushUps', 'weekPushUps', 'monthPushUps', 'totalPushUps',
      'subscriptionPlan', 'subscriptionStartedAt', 'subscriptionRenewsAt',
    ];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    if (req.body.isPlusSubscriber === true) {
      const today = new Date().toISOString().slice(0, 10);
      if (!user.subscriptionStartedAt) {
        user.subscriptionStartedAt = today;
      }
      if (!user.subscriptionRenewsAt) {
        const end = new Date();
        end.setMonth(end.getMonth() + 1);
        user.subscriptionRenewsAt = end.toISOString().slice(0, 10);
      }
      if (!user.subscriptionPlan) {
        user.subscriptionPlan = 'Pro 1 сар';
      }
    } else if (req.body.isPlusSubscriber === false) {
      user.subscriptionStartedAt = null;
      user.subscriptionRenewsAt = null;
      user.subscriptionPlan = null;
    }

    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.destroy();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
