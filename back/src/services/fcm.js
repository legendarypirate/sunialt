const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const APNS_TOPIC = process.env.FCM_APNS_TOPIC || 'com.gegee.delivery';
const FCM_MULTICAST_LIMIT = 500;
const STALE_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

let admin = null;
let messaging = null;
let initialized = false;
let lastInitError = null;
let resolvedCredentialsPath = null;

function trimEnv(value) {
  if (value == null) return '';
  return String(value).trim().replace(/^['"]|['"]$/g, '');
}

function resolveServiceAccountPath(configPath) {
  const trimmed = trimEnv(configPath);
  if (!trimmed) return null;
  if (path.isAbsolute(trimmed)) return trimmed;
  return path.resolve(projectRoot, trimmed);
}

function loadServiceAccountCredentials() {
  const inlineJson = trimEnv(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (inlineJson) {
    try {
      resolvedCredentialsPath = '(inline FIREBASE_SERVICE_ACCOUNT_JSON)';
      return JSON.parse(inlineJson);
    } catch (err) {
      lastInitError = `FIREBASE_SERVICE_ACCOUNT_JSON parse failed: ${err.message}`;
      return null;
    }
  }

  const configuredPath = trimEnv(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  if (!configuredPath) {
    lastInitError =
      'FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH is not set';
    return null;
  }

  resolvedCredentialsPath = resolveServiceAccountPath(configuredPath);
  if (!fs.existsSync(resolvedCredentialsPath)) {
    lastInitError = `Service account file not found: ${resolvedCredentialsPath}`;
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(resolvedCredentialsPath, 'utf8'));
  } catch (err) {
    lastInitError = `Failed to read ${resolvedCredentialsPath}: ${err.message}`;
    return null;
  }
}

function initFirebaseAdmin() {
  if (initialized) return messaging;

  const credentials = loadServiceAccountCredentials();
  if (!credentials) {
    initialized = true;
    return null;
  }

  try {
    // eslint-disable-next-line global-require
    admin = require('firebase-admin');

    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.cert(credentials) });
    }

    messaging = admin.messaging();
    lastInitError = null;
    console.log('[FCM] Firebase Admin initialized');
    if (resolvedCredentialsPath) {
      console.log(`[FCM] Credentials loaded from: ${resolvedCredentialsPath}`);
    }
  } catch (err) {
    lastInitError = err.message;
    console.warn('[FCM] Firebase Admin init failed:', err.message);
    messaging = null;
  }

  initialized = true;
  return messaging;
}

function isFcmConfigured() {
  return initFirebaseAdmin() != null;
}

function getFcmStatus() {
  initFirebaseAdmin();
  return {
    configured: messaging != null,
    error: lastInitError,
    credentialsPath: resolvedCredentialsPath,
    apnsTopic: APNS_TOPIC,
  };
}

async function sendToTokens(tokenEntries, { title, body, data = {} }) {
  const fcm = initFirebaseAdmin();
  const entries = (Array.isArray(tokenEntries) ? tokenEntries : [])
    .map((entry) =>
      typeof entry === 'string'
        ? { token: entry, platform: 'unknown' }
        : {
            token: entry.token,
            platform: entry.platform || 'unknown',
          }
    )
    .filter((entry) => entry.token);

  if (!fcm || !entries.length) {
    return {
      sent: 0,
      failed: entries.length,
      errors: entries.map((entry) => ({
        platform: entry.platform,
        tokenSuffix: entry.token.slice(-8),
        code: 'fcm-not-configured',
        message: 'FCM not configured',
      })),
    };
  }

  const uniqueEntries = [];
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.token)) continue;
    seen.add(entry.token);
    uniqueEntries.push(entry);
  }

  const payload = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries({ ...data, title, body }).map(([key, value]) => [
        key,
        String(value),
      ])
    ),
    android: {
      priority: 'high',
      notification: { channelId: 'sunia_push' },
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-push-type': 'alert',
        'apns-topic': APNS_TOPIC,
      },
      payload: {
        aps: {
          alert: { title, body },
          sound: 'default',
          'content-available': 1,
        },
      },
    },
  };

  let sent = 0;
  let failed = 0;
  const errors = [];
  const deliveredTokens = [];
  const staleTokens = [];

  // FCM allows up to 500 tokens per multicast call; sendEach fires the
  // individual requests concurrently instead of one-by-one.
  for (let i = 0; i < uniqueEntries.length; i += FCM_MULTICAST_LIMIT) {
    const chunk = uniqueEntries.slice(i, i + FCM_MULTICAST_LIMIT);
    let batch;
    try {
      batch = await fcm.sendEachForMulticast({
        tokens: chunk.map((entry) => entry.token),
        ...payload,
      });
    } catch (err) {
      failed += chunk.length;
      for (const entry of chunk) {
        errors.push({
          platform: entry.platform,
          tokenSuffix: entry.token.slice(-8),
          code: err.code || 'send-failed',
          message: err.message || String(err),
        });
      }
      console.warn('[FCM] multicast failed:', err.code || err.message);
      continue;
    }

    batch.responses.forEach((response, index) => {
      const entry = chunk[index];
      if (response.success) {
        sent += 1;
        deliveredTokens.push(entry.token);
        return;
      }
      failed += 1;
      const err = response.error || {};
      errors.push({
        platform: entry.platform,
        tokenSuffix: entry.token.slice(-8),
        code: err.code || 'send-failed',
        message: err.message || String(err),
      });
      if (STALE_TOKEN_CODES.has(err.code)) {
        staleTokens.push(entry.token);
      }
      console.warn(
        '[FCM] send failed:',
        entry.platform,
        `...${entry.token.slice(-8)}`,
        err.code || err.message
      );
    });
  }

  if (staleTokens.length) {
    // eslint-disable-next-line global-require
    const { DeviceToken } = require('../models');
    await DeviceToken.destroy({ where: { token: staleTokens } }).catch(() => {});
  }

  return { sent, failed, errors, deliveredTokens };
}

module.exports = {
  initFirebaseAdmin,
  isFcmConfigured,
  getFcmStatus,
  sendToTokens,
};
