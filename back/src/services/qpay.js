const { getQpayConfig } = require('./settings');

async function createQpayInvoice({ amount, orderId, description }) {
  const config = await getQpayConfig();
  if (!config.enabled) {
    const error = new Error('QPay is disabled');
    error.status = 400;
    throw error;
  }

  if (!config.clientId || !config.clientSecret || !config.invoiceCode) {
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

  const token = await getAccessToken(config);
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/invoice`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      invoice_code: config.invoiceCode,
      sender_invoice_no: String(orderId).slice(0, 45),
      invoice_receiver_code: 'terminal',
      invoice_description: (description || 'SUNIA order').slice(0, 255),
      amount: Number(amount),
      callback_url: config.callbackUrl || undefined,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'QPay invoice failed');
  }

  return {
    demo: false,
    invoiceId: data.invoice_id,
    qrText: data.qr_text,
    qrImage: normalizeQrImage(data.qr_image),
    urls: normalizeBankUrls(data.urls),
  };
}

function normalizeBankUrls(urls) {
  if (!Array.isArray(urls)) return [];
  return urls
    .map((item) => ({
      name: String(item.name || item.description || 'Bank'),
      description: String(item.description || item.name || ''),
      logo: String(item.logo || item.logo_url || ''),
      link: String(item.link || item.url || item.deeplink || ''),
    }))
    .filter((item) => item.link);
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

function normalizeQrImage(value) {
  if (!value) return value;
  const image = String(value).trim();
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('data:')) {
    return image;
  }
  return `data:image/png;base64,${image}`;
}

async function checkQpayPayment(invoiceId, { demo = false, confirm = false } = {}) {
  if (demo) {
    return { paid: Boolean(confirm), count: confirm ? 1 : 0 };
  }

  const config = await getQpayConfig();
  const token = await getAccessToken(config);
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/payment/check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      object_type: 'INVOICE',
      object_id: invoiceId,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || data.error || 'QPay check failed');
  }
  const count = Number(data.paid_amount || data.count || 0);
  return { paid: count > 0 || data.rows?.length > 0, count, raw: data };
}

async function getAccessToken(config) {
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.message || 'QPay auth failed');
  }
  return data.access_token;
}

module.exports = {
  createQpayInvoice,
  checkQpayPayment,
};
