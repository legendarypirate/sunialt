const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { getPushStats, sendAdminPush } = require('../services/adminPushNotifications');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/stats', async (_req, res) => {
  try {
    const stats = await getPushStats();
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/send', async (req, res) => {
  try {
    const { title, body, data, audience, userId } = req.body || {};
    const result = await sendAdminPush({
      title,
      body,
      data,
      audience: audience || 'all',
      userId,
    });
    res.json({
      ...result,
      message: `${result.sent} төхөөрөмжид мэдэгдэл илгээгдлээ`,
    });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

module.exports = router;
