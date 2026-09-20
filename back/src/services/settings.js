const { Setting } = require('../models');

async function getSetting(key, fallback = '') {
  const row = await Setting.findByPk(key);
  if (!row || row.value == null || row.value === '') return fallback;
  return row.value;
}

async function setSetting(key, value) {
  await Setting.upsert({ key, value: value == null ? '' : String(value) });
}

async function getQpayPublic() {
  const enabled = (await getSetting('qpay_enabled', 'true')) === 'true';
  return { qpayEnabled: enabled };
}

async function getQpayConfig() {
  const enabled = (await getSetting('qpay_enabled', 'true')) === 'true';
  return {
    enabled,
    clientId: await getSetting('qpay_client_id', process.env.QPAY_CLIENT_ID || ''),
    clientSecret: await getSetting('qpay_client_secret', process.env.QPAY_CLIENT_SECRET || ''),
    invoiceCode: await getSetting('qpay_invoice_code', process.env.QPAY_INVOICE_CODE || ''),
    baseUrl: await getSetting('qpay_base_url', process.env.QPAY_BASE_URL || 'https://merchant.qpay.mn/v2'),
    callbackUrl: await getSetting('qpay_callback_url', process.env.QPAY_CALLBACK_URL || ''),
  };
}

async function getQpayAdmin() {
  const config = await getQpayConfig();
  return {
    qpayEnabled: config.enabled,
    qpayClientId: config.clientId,
    qpayClientSecret: config.clientSecret,
    qpayInvoiceCode: config.invoiceCode,
    qpayBaseUrl: config.baseUrl,
    qpayCallbackUrl: config.callbackUrl,
  };
}

module.exports = {
  getSetting,
  setSetting,
  getQpayPublic,
  getQpayConfig,
  getQpayAdmin,
};
