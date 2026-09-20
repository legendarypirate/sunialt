const express = require('express');
const { Order, OrderItem, User } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateAdmin);

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
