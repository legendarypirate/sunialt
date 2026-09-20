const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const {
  User,
  Exercise,
  Product,
  Challenge,
  Badge,
  WorkoutSession,
  ChallengeEntry,
  Duel,
  Order,
  OrderItem,
} = require('../models');
const { authenticateUser, optionalUser, signUserToken } = require('../middleware/auth');
const { recordSession, formatProduct, dayKey } = require('../services/stats');
const { getQpayPublic } = require('../services/settings');
const { createQpayInvoice, checkQpayPayment } = require('../services/qpay');
const { verifyGoogleIdToken, isGoogleAuthConfigured } = require('../utils/googleAuth');

const router = express.Router();

function userPayload(user) {
  const json = user.toPublicJSON();
  return {
    id: json.id,
    email: json.email,
    displayName: json.displayName,
    tagline: json.tagline,
    photoUrl: json.photoUrl,
    dailyGoalReps: json.dailyGoalReps,
    todayPushUps: json.todayPushUps,
    weekPushUps: json.weekPushUps,
    monthPushUps: json.monthPushUps,
    totalPushUps: json.totalPushUps,
    streakDays: json.streakDays,
    workoutCount: json.completedWorkouts,
    weekBars: json.weekBars || [0, 0, 0, 0, 0, 0, 0],
    yearBars: json.yearBars || Array.from({ length: 12 }, () => 0),
    isPro: json.isPlusSubscriber,
    subscriptionPlan: json.subscriptionPlan,
    subscriptionRenewsAt: json.subscriptionRenewsAt,
    googleId: json.googleId || null,
    authProvider: json.googleId ? 'google' : 'email',
  };
}

async function upsertGoogleUser(payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) {
    const err = new Error('Google account has no email');
    err.status = 400;
    throw err;
  }

  const googleId = payload.sub;
  const displayName = payload.name || payload.given_name || email.split('@')[0];
  let user = googleId ? await User.findOne({ where: { googleId } }) : null;
  if (!user) {
    user = await User.findOne({ where: { email } });
  }

  if (!user) {
    return User.create({
      email,
      googleId,
      displayName,
      photoUrl: payload.picture || null,
      password: null,
    });
  }

  const updates = {};
  if (!user.googleId && googleId) updates.googleId = googleId;
  if (!user.photoUrl && payload.picture) updates.photoUrl = payload.picture;
  if (!user.displayName && displayName) updates.displayName = displayName;
  if (Object.keys(updates).length) {
    await user.update(updates);
  }
  return user;
}

async function catalogPayload(currentUser) {
  const [exercises, products, challenges, badges, leaders, payment] = await Promise.all([
    Exercise.findAll({
      where: { isPublished: true },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    }),
    Product.findAll({
      where: { isPublished: true },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    }),
    Challenge.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
    }),
    Badge.findAll({
      where: { isPublished: true },
      order: [['sortOrder', 'ASC']],
    }),
    dailyLeaderboard(currentUser),
    getQpayPublic(),
  ]);

  return {
    exercises,
    products: products.map(formatProduct),
    challenges,
    badges,
    leaderboard: leaders,
    payment,
  };
}

async function dailyLeaderboard(currentUser) {
  const start = new Date(`${dayKey(new Date())}T00:00:00.000Z`);
  const rows = await WorkoutSession.findAll({
    attributes: [
      'userId',
      [fn('SUM', col('rep_count')), 'score'],
    ],
    where: { completedAt: { [Op.gte]: start } },
    include: [{ model: User, as: 'user', attributes: ['id', 'displayName', 'email'] }],
    group: ['WorkoutSession.user_id', 'user.id', 'user.display_name', 'user.email'],
    order: [[literal('SUM(rep_count)'), 'DESC']],
    limit: 20,
  });

  return rows.map((row, index) => {
    const json = row.toJSON();
    return {
      rank: index + 1,
      userId: json.userId,
      name: json.user?.displayName || 'Хэрэглэгч',
      score: Number(json.score),
      isYou: currentUser ? json.userId === currentUser.id : false,
    };
  });
}

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });

    res.status(201).json({
      token: signUserToken(user),
      user: userPayload(user),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/auth/config', async (_req, res) => {
  res.json({
    googleSignInConfigured: isGoogleAuthConfigured(),
  });
});

router.post('/auth/google', async (req, res) => {
  try {
    if (!isGoogleAuthConfigured()) {
      return res.status(503).json({ error: 'Google нэвтрэлт сервер дээр тохируулаагүй байна' });
    }

    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google idToken шаардлагатай' });
    }

    const payload = await verifyGoogleIdToken(idToken);
    const user = await upsertGoogleUser(payload);
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    res.json({
      token: signUserToken(user),
      user: userPayload(user),
    });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await user.validatePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      token: signUserToken(user),
      user: userPayload(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/catalog', optionalUser, async (req, res) => {
  try {
    res.json(await catalogPayload(req.user || null));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/bootstrap', authenticateUser, async (req, res) => {
  try {
    const catalog = await catalogPayload(req.user);
    res.json({
      user: userPayload(req.user),
      ...catalog,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticateUser, (req, res) => {
  res.json({ user: userPayload(req.user) });
});

router.patch('/me', authenticateUser, async (req, res) => {
  try {
    const allowed = ['displayName', 'tagline', 'photoUrl', 'dailyGoalReps'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    });
    await req.user.save();
    res.json({ user: userPayload(req.user) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/dashboard', authenticateUser, async (req, res) => {
  try {
    const catalog = await catalogPayload(req.user);
    res.json({
      user: userPayload(req.user),
      leaderboard: catalog.leaderboard,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/leaderboard', optionalUser, async (req, res) => {
  try {
    res.json({ leaderboard: await dailyLeaderboard(req.user || null) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions', authenticateUser, async (req, res) => {
  try {
    const models = { WorkoutSession, ChallengeEntry };
    const session = await recordSession(models, req.user, req.body);
    res.status(201).json({
      session,
      user: userPayload(req.user),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/duels', authenticateUser, async (req, res) => {
  try {
    const duel = await Duel.create({
      userId: req.user.id,
      opponentName: req.body.opponentName || 'Шууд',
      userScore: Number(req.body.userScore) || 0,
      opponentScore: Number(req.body.opponentScore) || 28,
      status: 'finished',
    });

    if ((Number(req.body.userScore) || 0) > 0) {
      await recordSession({ WorkoutSession, ChallengeEntry }, req.user, {
        exerciseTitle: 'Шууд тулаан',
        repCount: Number(req.body.userScore),
        source: 'duel',
      });
    }

    res.status(201).json({ duel, user: userPayload(req.user) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/payments', async (_req, res) => {
  try {
    res.json(await getQpayPublic());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders', authenticateUser, async (req, res) => {
  try {
    const phone = String(req.body.phone || '').trim();
    const address = String(req.body.address || '').trim();
    if (!phone || !address) {
      return res.status(400).json({ error: 'Phone and address are required' });
    }

    const payment = await getQpayPublic();
    if (!payment.qpayEnabled) {
      return res.status(400).json({ error: 'QPay is disabled' });
    }

    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const productIds = items.map((item) => item.productId).filter(Boolean);
    const products = productIds.length
      ? await Product.findAll({ where: { id: productIds, isPublished: true } })
      : [];
    const byId = Object.fromEntries(products.map((product) => [product.id, product]));

    let total = 0;
    const orderItems = items.map((item) => {
      const product = item.productId ? byId[item.productId] : null;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitPrice = product ? Number(product.price) : Number(item.unitPrice);
      if (!product && (!item.title || !unitPrice)) {
        throw new Error('Product not found');
      }
      total += unitPrice * quantity;
      return {
        productId: product ? product.id : null,
        title: product ? product.title : item.title,
        quantity,
        unitPrice,
      };
    });

    const order = await Order.create({
      userId: req.user.id,
      status: 'pending',
      total,
      phone,
      address,
      paymentMethod: 'qpay',
      paymentStatus: 'unpaid',
    });
    await OrderItem.bulkCreate(orderItems.map((item) => ({ ...item, orderId: order.id })));

    const invoice = await createQpayInvoice({
      amount: total,
      orderId: order.id,
      description: `SUNIA ${order.id.slice(0, 8)}`,
    });
    order.qpayInvoiceId = invoice.invoiceId;
    order.qpayQrImage = invoice.qrImage;
    order.qpayDemo = Boolean(invoice.demo);
    await order.save();

    const created = await Order.findByPk(order.id, { include: [{ model: OrderItem, as: 'items' }] });
    res.status(201).json({
      order: created,
      qpay: {
        enabled: true,
        demo: invoice.demo,
        invoiceId: invoice.invoiceId,
        qrImage: invoice.qrImage,
        qrText: invoice.qrText,
        urls: invoice.urls || [],
      },
    });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/orders/:id/qpay/check', authenticateUser, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }] });
    if (!order || order.userId !== req.user.id) return res.status(404).json({ error: 'Order not found' });

    const result = await checkQpayPayment(order.qpayInvoiceId, {
      demo: order.qpayDemo,
      confirm: Boolean(req.body.confirm),
    });

    if (result.paid) {
      order.paymentStatus = 'paid';
      order.status = 'paid';
      await order.save();
    }

    res.json({
      paid: order.paymentStatus === 'paid',
      order,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
