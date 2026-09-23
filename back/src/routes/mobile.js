const express = require('express');
const { Op, fn, col, literal } = require('sequelize');
const {
  User,
  Exercise,
  Product,
  ProductCategory,
  Challenge,
  Badge,
  WorkoutSession,
  ChallengeEntry,
  Duel,
  Order,
  OrderItem,
} = require('../models');
const { authenticateUser, optionalUser, signUserToken } = require('../middleware/auth');
const {
  recordSession,
  formatProduct,
  formatProductCategory,
  startOfDay,
  applyFreshCounters,
  dayKey,
} = require('../services/stats');
const { getQpayPublic, getSetting } = require('../services/settings');
const { createQpayInvoice, checkQpayPayment } = require('../services/qpay');
const { verifyGoogleIdToken, isGoogleAuthConfigured } = require('../utils/googleAuth');
const { withExerciseImages } = require('../utils/exerciseImages');

const router = express.Router();

function userPayload(user) {
  const json = user.toPublicJSON();
  return {
    id: json.publicId,
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
    lastWorkoutAt: json.lastWorkoutAt || null,
    heightCm: json.heightCm ?? 175,
    weightKg: json.weightKg ?? 72,
    age: json.age ?? 24,
    fitnessLevel: json.fitnessLevel || 'Дунд шат',
    goalWeightKg: json.goalWeightKg ?? 70,
  };
}

const FITNESS_LEVELS = ['Анхан шат', 'Дунд шат', 'Ахисан шат'];

function clampInt(value, min, max) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
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
  const [exercises, products, productCategories, challenges, badges, leaders, payment] = await Promise.all([
    Exercise.findAll({
      where: { isPublished: true },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    }),
    Product.findAll({
      where: { isPublished: true },
      include: [{ model: ProductCategory, as: 'productCategory', required: false }],
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    }),
    ProductCategory.findAll({
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
    exercises: exercises.map(withExerciseImages),
    products: products.map(formatProduct),
    productCategories: productCategories.map(formatProductCategory),
    challenges,
    badges,
    leaderboard: leaders,
    payment,
  };
}

async function dailyLeaderboard(currentUser) {
  const start = startOfDay(new Date());
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

    await applyFreshCounters(user);
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

    await applyFreshCounters(user);
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
    await applyFreshCounters(req.user);
    const catalog = await catalogPayload(req.user);
    res.json({
      user: userPayload(req.user),
      ...catalog,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticateUser, async (req, res) => {
  try {
    await applyFreshCounters(req.user);
    res.json({ user: userPayload(req.user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const MIN_DAILY_GOAL = 1;
const MAX_DAILY_GOAL = 9999;

router.patch('/me', authenticateUser, async (req, res) => {
  try {
    const allowed = ['displayName', 'tagline', 'photoUrl'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) req.user[field] = req.body[field];
    });
    if (req.body.dailyGoalReps !== undefined) {
      const goal = clampInt(req.body.dailyGoalReps, MIN_DAILY_GOAL, MAX_DAILY_GOAL);
      if (goal == null) return res.status(400).json({ error: 'Invalid daily goal' });
      req.user.dailyGoalReps = goal;
    }
    if (req.body.heightCm !== undefined) {
      const height = clampInt(req.body.heightCm, 100, 250);
      if (height == null) return res.status(400).json({ error: 'Invalid height' });
      req.user.heightCm = height;
    }
    if (req.body.weightKg !== undefined) {
      const weight = clampInt(req.body.weightKg, 30, 250);
      if (weight == null) return res.status(400).json({ error: 'Invalid weight' });
      req.user.weightKg = weight;
    }
    if (req.body.age !== undefined) {
      const age = clampInt(req.body.age, 10, 120);
      if (age == null) return res.status(400).json({ error: 'Invalid age' });
      req.user.age = age;
    }
    if (req.body.fitnessLevel !== undefined) {
      const level = String(req.body.fitnessLevel || '').trim();
      if (!FITNESS_LEVELS.includes(level)) {
        return res.status(400).json({ error: 'Invalid fitness level' });
      }
      req.user.fitnessLevel = level;
    }
    if (req.body.goalWeightKg !== undefined) {
      const goal = clampInt(req.body.goalWeightKg, 30, 250);
      if (goal == null) return res.status(400).json({ error: 'Invalid goal weight' });
      req.user.goalWeightKg = goal;
    }
    await req.user.save();
    res.json({ user: userPayload(req.user) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/dashboard', authenticateUser, async (req, res) => {
  try {
    await applyFreshCounters(req.user);
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

router.get('/progress', authenticateUser, async (req, res) => {
  try {
    const sessions = await WorkoutSession.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'exerciseTitle', 'repCount', 'durationSeconds', 'completedAt', 'source'],
      order: [['completedAt', 'ASC']],
    });
    const byDay = new Map();
    for (const session of sessions) {
      const date = dayKey(session.completedAt);
      const current = byDay.get(date) || {
        date,
        repCount: 0,
        sessionCount: 0,
        durationSeconds: 0,
      };
      current.repCount += Number(session.repCount) || 0;
      current.sessionCount += 1;
      current.durationSeconds += Number(session.durationSeconds) || 0;
      byDay.set(date, current);
    }
    const recent = [...sessions].reverse().slice(0, 20).map((session) => ({
      id: session.id,
      title: session.exerciseTitle,
      repCount: Number(session.repCount) || 0,
      durationSeconds: Number(session.durationSeconds) || 0,
      completedAt: session.completedAt,
      source: session.source,
    }));
    res.json({ days: [...byDay.values()], sessions: recent });
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

const ONLINE_WINDOW_MS = 15 * 60 * 1000;

function formatLastSeen(lastWorkoutAt) {
  if (!lastWorkoutAt) return 'Сүүлд идэвхгүй';
  const diffMs = Date.now() - new Date(lastWorkoutAt).getTime();
  if (diffMs < ONLINE_WINDOW_MS) return 'Онлайн';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `Сүүлд ${minutes} минутын өмнө`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Сүүлд ${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  return `Сүүлд ${days} өдрийн өмнө`;
}

function formatBattleDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

router.get('/friends', authenticateUser, async (req, res) => {
  try {
    await applyFreshCounters(req.user);
    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);
    const users = await User.findAll({
      where: {
        isActive: true,
        id: { [Op.ne]: req.user.id },
        publicId: { [Op.ne]: null },
      },
      attributes: [
        'publicId',
        'displayName',
        'photoUrl',
        'todayPushUps',
        'streakDays',
        'lastWorkoutAt',
      ],
      order: [['todayPushUps', 'DESC'], ['displayName', 'ASC']],
      limit: 50,
    });

    const friends = users
      .map((user) => ({
        id: user.publicId,
        name: user.displayName || 'Хэрэглэгч',
        photoUrl: user.photoUrl,
        todayPushUps: user.todayPushUps || 0,
        streakDays: user.streakDays || 0,
        isOnline: Boolean(user.lastWorkoutAt && user.lastWorkoutAt >= onlineSince),
        lastSeen: formatLastSeen(user.lastWorkoutAt),
        inMatch: false,
      }))
      .sort((a, b) => {
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
        return b.todayPushUps - a.todayPushUps;
      });

    res.json({ friends });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/duels/recent', authenticateUser, async (req, res) => {
  try {
    const duels = await Duel.findAll({
      where: {
        [Op.or]: [
          { userId: req.user.id },
          { opponentId: req.user.id },
        ],
      },
      include: [
        { model: User, as: 'user', attributes: ['publicId', 'displayName'] },
        { model: User, as: 'opponent', attributes: ['publicId', 'displayName'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    res.json({
      battles: duels.map((duel) => {
        const isCreator = duel.userId === req.user.id;
        const youScore = isCreator ? duel.userScore : duel.opponentScore;
        const theirScore = isCreator ? duel.opponentScore : duel.userScore;
        const theirName = isCreator
          ? duel.opponent?.displayName || duel.opponentName || 'Сөрөгч'
          : duel.user?.displayName || 'Сөрөгч';

        return {
          id: duel.id,
          leftName: 'Та',
          leftScore: youScore,
          rightName: theirName,
          rightScore: theirScore,
          challengeName: 'Шууд тулаан',
          dateLabel: formatBattleDate(duel.createdAt),
          youOnLeft: true,
        };
      }),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users/lookup', authenticateUser, async (req, res) => {
  try {
    const publicId = clampInt(req.query.id, 1, 999999999);
    if (publicId == null) {
      return res.status(400).json({ error: 'ID шаардлагатай' });
    }

    const user = await User.findOne({
      where: { publicId, isActive: true },
      attributes: ['id', 'publicId', 'displayName', 'photoUrl', 'todayPushUps', 'streakDays'],
    });

    if (!user) {
      return res.status(404).json({ error: 'Хэрэглэгч олдсонгүй' });
    }
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Өөртөө тулаан зарлах боломжгүй' });
    }

    res.json({
      user: {
        id: user.publicId,
        displayName: user.displayName || 'Хэрэглэгч',
        photoUrl: user.photoUrl,
        todayPushUps: user.todayPushUps || 0,
        streakDays: user.streakDays || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/duels', authenticateUser, async (req, res) => {
  try {
    const opponentPublicId = clampInt(req.body.opponentId, 1, 999999999);
    let opponentUuid = null;
    let opponentName = String(req.body.opponentName || '').trim() || 'Шууд';
    let opponentScore = Number(req.body.opponentScore) || 28;

    if (opponentPublicId != null) {
      const opponent = await User.findOne({
        where: { publicId: opponentPublicId, isActive: true },
        attributes: ['id', 'displayName', 'todayPushUps'],
      });
      if (!opponent) {
        return res.status(404).json({ error: 'Сөрөгч олдсонгүй' });
      }
      if (opponent.id === req.user.id) {
        return res.status(400).json({ error: 'Өөртөө тулаан зарлах боломжгүй' });
      }
      opponentUuid = opponent.id;
      opponentName = opponent.displayName || opponentName;
      if (!req.body.opponentScore) {
        opponentScore = opponent.todayPushUps || 0;
      }
    }

    const duel = await Duel.create({
      userId: req.user.id,
      opponentId: opponentUuid,
      opponentName,
      userScore: Number(req.body.userScore) || 0,
      opponentScore,
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

const SUBSCRIPTION_ITEM_TITLE = '__subscription__';

async function activateSubscription(user) {
  const renews = new Date();
  renews.setMonth(renews.getMonth() + 1);
  await user.update({
    isPlusSubscriber: true,
    subscriptionPlan: 'Pro төлөвлөгөө',
    subscriptionRenewsAt: renews.toISOString().slice(0, 10),
  });
}

function isSubscriptionOrder(order) {
  const items = order.items || [];
  return items.some((item) => item.title === SUBSCRIPTION_ITEM_TITLE);
}

router.post('/subscription/checkout', authenticateUser, async (req, res) => {
  try {
    if (req.user.isPlusSubscriber) {
      return res.status(400).json({ error: 'Premium already active' });
    }

    const payment = await getQpayPublic();
    if (!payment.qpayEnabled) {
      return res.status(400).json({ error: 'QPay is disabled' });
    }

    const price = Number(
      await getSetting('subscription_price', process.env.SUBSCRIPTION_PRICE || '19900'),
    );
    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ error: 'Subscription price is not configured' });
    }

    const order = await Order.create({
      userId: req.user.id,
      status: 'pending',
      total: price,
      paymentMethod: 'qpay',
      paymentStatus: 'unpaid',
      phone: 'premium',
      address: 'subscription',
    });
    await OrderItem.create({
      orderId: order.id,
      title: SUBSCRIPTION_ITEM_TITLE,
      quantity: 1,
      unitPrice: price,
    });

    const invoice = await createQpayInvoice({
      amount: price,
      orderId: order.id,
      description: 'SUNIA Pro',
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

router.post('/subscription/:id/qpay/check', authenticateUser, async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }] });
    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!isSubscriptionOrder(order)) {
      return res.status(400).json({ error: 'Not a subscription order' });
    }

    const result = await checkQpayPayment(order.qpayInvoiceId, {
      demo: order.qpayDemo,
      confirm: Boolean(req.body.confirm),
    });

    if (result.paid) {
      order.paymentStatus = 'paid';
      order.status = 'paid';
      await order.save();
      await activateSubscription(req.user);
      await req.user.reload();
    }

    res.json({
      paid: order.paymentStatus === 'paid',
      order,
      user: userPayload(req.user),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
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
