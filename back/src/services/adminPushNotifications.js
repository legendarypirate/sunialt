const { Op } = require('sequelize');
const { User, DeviceToken } = require('../models');
const { isFcmConfigured, sendToTokens, getFcmStatus } = require('./fcm');
const { recordUserNotification } = require('./userNotifications');

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
    attributes: ['userId', 'token', 'platform'],
  });

  const payloadData = {
    type: 'admin_broadcast',
    ...Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)])
    ),
  };

  const broadcastKey = Date.now().toString(36);
  const tokensByUser = new Map();
  for (const row of tokenRows) {
    const list = tokensByUser.get(row.userId) || [];
    list.push(row);
    tokensByUser.set(row.userId, list);
  }

  let sent = 0;
  let failed = 0;
  const errors = [];

  for (const userId of userIds) {
    const userTokens = tokensByUser.get(userId) || [];
    if (!userTokens.length) continue;

    const result = await sendToTokens(userTokens, {
      title: trimmedTitle,
      body: trimmedBody,
      data: payloadData,
    });

    sent += result.sent;
    failed += result.failed;
    if (result.errors?.length) errors.push(...result.errors);

    if (result.sent > 0) {
      await recordUserNotification({
        userId,
        reminderKey: `admin_${broadcastKey}_${userId}`,
        title: trimmedTitle,
        body: trimmedBody,
        type: 'admin_broadcast',
      });
    }
  }

  return {
    sent,
    failed,
    errors,
    recipientCount: userIds.length,
    tokenCount: tokenRows.length,
    fcmConfigured: true,
  };
}

module.exports = {
  getPushStats,
  sendAdminPush,
};
