const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const APNS_TOPIC = process.env.FCM_APNS_TOPIC || 'com.gegee.delivery';

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

  for (const entry of uniqueEntries) {
    try {
      await fcm.send({ token: entry.token, ...payload });
      sent += 1;
    } catch (err) {
      failed += 1;
      errors.push({
        platform: entry.platform,
        tokenSuffix: entry.token.slice(-8),
        code: err.code || 'send-failed',
        message: err.message || String(err),
      });
      if (
        err.code === 'messaging/registration-token-not-registered' ||
        err.code === 'messaging/invalid-registration-token'
      ) {
        // eslint-disable-next-line global-require
        const { DeviceToken } = require('../models');
        await DeviceToken.destroy({ where: { token: entry.token } }).catch(() => {});
      }
      console.warn(
        '[FCM] send failed:',
        entry.platform,
        `...${entry.token.slice(-8)}`,
        err.code || err.message
      );
    }
  }

  return { sent, failed, errors };
}

module.exports = {
  initFirebaseAdmin,
  isFcmConfigured,
  getFcmStatus,
  sendToTokens,
};
