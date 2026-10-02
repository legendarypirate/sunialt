const express = require('express');
const { sequelize, Order, OrderItem, User } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');
const { checkQpayPayment } = require('../services/qpay');
const {
  buildUserSubscriptionFields,
  resolvePlanId,
} = require('../services/subscriptionPlans');

const router = express.Router();
router.use(authenticateAdmin);

const SUBSCRIPTION_ITEM_TITLE = '__subscription__';

function subscriptionPlanId(order) {
  const address = String(order.address || '');
  if (!address.startsWith('subscription:')) return null;
  return resolvePlanId(address.slice('subscription:'.length));
}

router.get('/qpay-payments', async (req, res) => {
  try {
    const requestedPage = Number.parseInt(req.query.page, 10);
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(100, Math.max(1, requestedLimit))
      : 30;
    const offset = (page - 1) * limit;

    const { count, rows } = await Order.findAndCountAll({
      where: { paymentMethod: 'qpay' },
      include: [
        { model: User, as: 'user', attributes: ['id', 'displayName', 'email'] },
        { model: OrderItem, as: 'items', attributes: ['id', 'title', 'quantity', 'unitPrice'] },
      ],
      distinct: true,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    res.json({
      payments: rows,
      pagination: {
        total: count,
        page,
        limit,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/qpay/check', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: [
            'id',
            'displayName',
            'email',
            'isPlusSubscriber',
            'subscriptionPlan',
            'subscriptionStartedAt',
            'subscriptionRenewsAt',
          ],
        },
        { model: OrderItem, as: 'items' },
      ],
    });
    if (!order || order.paymentMethod !== 'qpay') {
      return res.status(404).json({ error: 'QPay payment not found' });
    }
    if (!order.qpayInvoiceId) {
      return res.status(400).json({ error: 'QPay invoice ID is missing' });
    }

    if (order.paymentStatus !== 'paid') {
      const result = await checkQpayPayment(order.qpayInvoiceId, {
        demo: order.qpayDemo,
      });

      if (result.paid) {
        const isSubscription = order.items?.some(
          (item) => item.title === SUBSCRIPTION_ITEM_TITLE
        );
        const planId = subscriptionPlanId(order);

        await sequelize.transaction(async (transaction) => {
          if (isSubscription && planId && order.user) {
            await order.user.update(
              buildUserSubscriptionFields(order.user, planId, { extend: false }),
              { transaction }
            );
          }
          order.paymentStatus = 'paid';
          order.status = 'paid';
          await order.save({ transaction });
        });
      }
    }

    res.json({
      paid: order.paymentStatus === 'paid',
      payment: order,
    });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const orders = await Order.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'displayName', 'email'] },
        { model: OrderItem, as: 'items' },
      ],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.body.status) order.status = req.body.status;
    await order.save();
    res.json({ order });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
