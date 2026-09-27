const crypto = require('crypto');
const https = require('https');
const jwt = require('jsonwebtoken');

const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const DEFAULT_APPLE_AUDIENCE = 'com.gegee.delivery';

let cachedKeys = null;
let cachedAt = 0;

function getAppleAudiences() {
  const raw = process.env.APPLE_CLIENT_IDS || process.env.APPLE_CLIENT_ID || DEFAULT_APPLE_AUDIENCE;
  const fromEnv = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : [DEFAULT_APPLE_AUDIENCE];
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Apple keys request failed (${res.statusCode})`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.setTimeout(10000, () => {
      req.destroy(new Error('Apple keys request timed out'));
    });
    req.on('error', reject);
  });
}

async function getAppleKeys(forceRefresh = false) {
  if (!forceRefresh && cachedKeys && Date.now() - cachedAt < 60 * 60 * 1000) {
    return cachedKeys;
  }
  const body = await fetchJson(APPLE_KEYS_URL);
  cachedKeys = Array.isArray(body.keys) ? body.keys : [];
  cachedAt = Date.now();
  return cachedKeys;
}

function jwkToPem(jwk) {
  const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  return key.export({ type: 'spki', format: 'pem' });
}

async function verifyAppleIdentityToken(identityToken, { rawNonce } = {}) {
  if (!identityToken || typeof identityToken !== 'string') {
    const err = new Error('Apple identityToken шаардлагатай');
    err.status = 400;
    throw err;
  }

  const decoded = jwt.decode(identityToken, { complete: true });
  const kid = decoded && decoded.header && decoded.header.kid;
  if (!kid) {
    const err = new Error('Apple нэвтрэлт баталгаажсангүй');
    err.status = 401;
    throw err;
  }

  let keys = await getAppleKeys();
  let jwk = keys.find((key) => key.kid === kid);
  if (!jwk) {
    keys = await getAppleKeys(true);
    jwk = keys.find((key) => key.kid === kid);
  }
  if (!jwk) {
    const err = new Error('Apple нэвтрэлт баталгаажсангүй');
    err.status = 401;
    throw err;
  }

  let payload;
  try {
    payload = jwt.verify(identityToken, jwkToPem(jwk), {
      algorithms: ['RS256'],
      issuer: APPLE_ISSUER,
      audience: getAppleAudiences(),
    });
  } catch (cause) {
    const err = new Error('Apple нэвтрэлт баталгаажсангүй');
    err.status = 401;
    err.cause = cause;
    throw err;
  }

  if (rawNonce) {
    const expected = crypto.createHash('sha256').update(rawNonce).digest('hex');
    if (!payload.nonce || payload.nonce !== expected) {
      const err = new Error('Apple нэвтрэлт баталгаажсангүй');
      err.status = 401;
      throw err;
    }
  }

  return payload;
}

module.exports = {
  getAppleAudiences,
  verifyAppleIdentityToken,
};
