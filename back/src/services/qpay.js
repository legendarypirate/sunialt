const { getQpayConfig } = require('./settings');
const qpayService = require('./qpayService');

function allowDemoFallback() {
  if (process.env.QPAY_ALLOW_DEMO === '1') return true;
  return process.env.NODE_ENV !== 'production';
}

function demoBankUrls(qrText) {
  const payload = encodeURIComponent(qrText);
  return [
    ['qPay', 'qpay', 'qpaywallet'],
    ['Khan bank', 'khanbank', 'khanbank'],
    ['SocialPay', 'socialpay', 'socialpay-payment'],
    ['TDB', 'tdbbank', 'tdbbank'],
    ['State bank', 'statebank', 'statebankmn'],
    ['XacBank', 'xacbank', 'xacbank'],
    ['Most money', 'mostmoney', 'most'],
    ['M bank', 'mbank', 'mbank'],
  ].map(([name, logo, scheme]) => ({
    name,
    description: name,
    logo: `https://qpay.mn/q/logo/${logo}.png`,
    link: `${scheme}://q?qPay_QRcode=${payload}`,
  }));
}

async function createQpayInvoice({ amount, orderId, description }) {
  const config = await getQpayConfig();
  if (!config.enabled) {
    const error = new Error('QPay is disabled');
    error.status = 400;
    throw error;
  }

  if (!qpayService.isConfigured(config)) {
    if (!allowDemoFallback()) {
      const error = new Error(
        'QPay merchant тохиргоо дутуу байна. QPAY_LOGIN, QPAY_PASSWORD, QPAY_INVOICE_CODE, QPAY_RECEIVER_CODE тохируулна уу.'
      );
      error.status = 503;
      throw error;
    }

    const invoiceId = `demo-${orderId}`;
    const qrText = `QPAY:${invoiceId}:${amount}`;
    return {
      demo: true,
      invoiceId,
      qrText,
      qrImage: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`qpay://${invoiceId}`)}`,
      urls: demoBankUrls(qrText),
    };
  }

  return qpayService.createInvoice(config, {
    amount,
    description,
    senderInvoiceNo: orderId,
  });
}

async function checkQpayPayment(invoiceId, { demo = false, confirm = false } = {}) {
  if (demo) {
    return { paid: Boolean(confirm), count: confirm ? 1 : 0 };
  }

  const config = await getQpayConfig();
  if (!qpayService.isConfigured(config)) {
    return { paid: Boolean(confirm), count: confirm ? 1 : 0 };
  }

  return qpayService.checkInvoicePayment(config, invoiceId);
}

async function getQpayStatus() {
  const config = await getQpayConfig();
  return {
    qpayEnabled: config.enabled,
    qpayConfigured: qpayService.isConfigured(config),
  };
}

module.exports = {
  createQpayInvoice,
  checkQpayPayment,
  getQpayStatus,
  isQpayConfigured: qpayService.isConfigured,
};
