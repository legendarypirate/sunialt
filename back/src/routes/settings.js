const express = require('express');
const { authenticateAdmin } = require('../middleware/auth');
const { getQpayAdmin, setSetting } = require('../services/settings');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', async (_req, res) => {
  try {
    res.json({ settings: await getQpayAdmin() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const payload = req.body || {};
    if (payload.qpayEnabled !== undefined) {
      await setSetting('qpay_enabled', payload.qpayEnabled ? 'true' : 'false');
    }
    if (payload.qpayClientId !== undefined) {
      await setSetting('qpay_client_id', payload.qpayClientId);
    }
    if (payload.qpayClientSecret !== undefined) {
      await setSetting('qpay_client_secret', payload.qpayClientSecret);
    }
    if (payload.qpayInvoiceCode !== undefined) {
      await setSetting('qpay_invoice_code', payload.qpayInvoiceCode);
    }
    if (payload.qpayReceiverCode !== undefined) {
      await setSetting('qpay_receiver_code', payload.qpayReceiverCode);
    }
    if (payload.qpayBaseUrl !== undefined) {
      await setSetting('qpay_base_url', payload.qpayBaseUrl);
    }
    if (payload.qpayCallbackUrl !== undefined) {
      await setSetting('qpay_callback_url', payload.qpayCallbackUrl);
    }
    res.json({ settings: await getQpayAdmin() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
