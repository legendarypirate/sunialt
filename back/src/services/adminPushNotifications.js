const { Op } = require('sequelize');
const { User, DeviceToken } = require('../models');
const { isFcmConfigured, sendToTokens, getFcmStatus } = require('./fcm');

const AUDIENCE_KEYS = ['all', 'free', 'pro'];

async function countEligibleRecipients(audience) {
  const userIds = await resolveTargetUserIds({ audience });
  if (!userIds.length) {
    return { users: 0, devices: 0 };
  }

  const tokenRows = await DeviceToken.findAll({
    where: { userId: { [Op.in]: userIds } },
    attributes: ['userId'],
  });

  return {
    users: new Set(tokenRows.map((row) => row.userId)).size,
    devices: tokenRows.length,
  };
}

async function getPushStats() {
  const tokenRows = await DeviceToken.findAll({
    attributes: ['userId', 'token', 'platform', 'updatedAt', 'createdAt'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['email', 'displayName'],
      },
    ],
    order: [['updatedAt', 'DESC']],
  });
  const userIds = new Set(tokenRows.map((row) => row.userId));
  const fcmStatus = getFcmStatus();

  const audienceCounts = {};
  await Promise.all(
    AUDIENCE_KEYS.map(async (key) => {
      audienceCounts[key] = await countEligibleRecipients(key);
    })
  );

  return {
    fcmConfigured: isFcmConfigured(),
    fcmInitError: fcmStatus.error,
    credentialsPath: fcmStatus.credentialsPath,
    apnsTopic: fcmStatus.apnsTopic,
    registeredDevices: tokenRows.length,
    usersWithTokens: userIds.size,
    iosDevices: tokenRows.filter((row) => row.platform === 'ios').length,
    androidDevices: tokenRows.filter((row) => row.platform === 'android').length,
    audienceCounts,
    devices: tokenRows.map((row) => ({
      userId: row.userId,
      userEmail: row.user?.email || null,
      userName: row.user?.displayName || null,
      platform: row.platform,
      tokenSuffix: row.token.slice(-8),
      updatedAt: row.updatedAt,
    })),
  };
}

async function resolveTargetUserIds({ audience = 'all', userId }) {
  const where = { isActive: true };

  if (userId) {
    where.id = userId;
  } else if (audience === 'free') {
    where.isPlusSubscriber = false;
  } else if (audience === 'pro') {
    where.isPlusSubscriber = true;
  } else if (audience !== 'all') {
    const err = new Error(`Буруу audience: ${audience}. Зөвшөөрөгдсөн: ${AUDIENCE_KEYS.join(', ')}`);
    err.status = 400;
    throw err;
  }

  const users = await User.findAll({
    where,
    attributes: ['id'],
  });
  return users.map((user) => user.id);
}

async function sendAdminPush({ title, body, data = {}, audience = 'all', userId }) {
  if (!isFcmConfigured()) {
    const { error } = getFcmStatus();
    const err = new Error(
      error ||
        'FCM тохиргоо хийгдээгүй байна (FIREBASE_SERVICE_ACCOUNT_JSON эсвэл FIREBASE_SERVICE_ACCOUNT_PATH)'
    );
    err.status = 503;
    throw err;
  }

  const trimmedTitle = String(title || '').trim();
  const trimmedBody = String(body || '').trim();
  if (!trimmedTitle || !trimmedBody) {
    const err = new Error('Гарчиг болон мессеж шаардлагатай');
    err.status = 400;
    throw err;
  }

  const userIds = await resolveTargetUserIds({ audience, userId });
  if (!userIds.length) {
    return {
      sent: 0,
      failed: 0,
      recipientCount: 0,
      tokenCount: 0,
      fcmConfigured: true,
      errors: [],
    };
  }

  const tokenRows = await DeviceToken.findAll({
    where: { userId: { [Op.in]: userIds } },
    attributes: ['token', 'platform'],
  });

  const payloadData = {
    type: 'admin_broadcast',
    ...Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)])
    ),
  };

  const result = await sendToTokens(tokenRows, {
    title: trimmedTitle,
    body: trimmedBody,
    data: payloadData,
  });

  return {
    sent: result.sent,
    failed: result.failed,
    errors: result.errors || [],
    recipientCount: userIds.length,
    tokenCount: tokenRows.length,
    fcmConfigured: true,
  };
}

module.exports = {
  getPushStats,
  sendAdminPush,
};
