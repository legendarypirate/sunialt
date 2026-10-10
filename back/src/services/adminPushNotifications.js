const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, DeviceToken, NotificationLog } = require('../models');
const { isFcmConfigured, sendToTokens, getFcmStatus } = require('./fcm');

const AUDIENCE_KEYS = ['all', 'free', 'pro'];
const MAX_SELECTED_USERS = 500;
const RECIPIENT_SEARCH_LIMIT = 20;
const SEND_BATCH_SIZE = 500;
const LOG_INSERT_CHUNK = 1000;
const MAX_STORED_ERRORS = 50;
const RECENT_DEVICES_LIMIT = 20;
// How long the HTTP request waits for a broadcast before handing back a job
// id for polling. Small sends finish inline; large ones continue in background.
const INLINE_WAIT_MS = 5000;
const JOB_TTL_MS = 6 * 60 * 60 * 1000;

const jobs = new Map();

function normalizeUserIds(userIds) {
  if (userIds == null) return null;
  if (!Array.isArray(userIds)) {
    const err = new Error('userIds массив байх ёстой');
    err.status = 400;
    throw err;
  }
  const ids = [...new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) {
    const err = new Error('Хамгийн багадаа нэг хэрэглэгч сонгоно уу');
    err.status = 400;
    throw err;
  }
  if (ids.length > MAX_SELECTED_USERS) {
    const err = new Error(`Нэг удаад хамгийн ихдээ ${MAX_SELECTED_USERS} хэрэглэгч сонгох боломжтой`);
    err.status = 400;
    throw err;
  }
  return ids;
}

function audienceWhere(audience, userId, userIds) {
  const where = { isActive: true };

  if (userIds) {
    where.id = { [Op.in]: userIds };
  } else if (userId) {
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

  return where;
}

async function findAudienceTokens({ audience = 'all', userId, userIds }) {
  // Single joined query instead of "fetch all user ids, then IN (...)".
  return DeviceToken.findAll({
    attributes: ['userId', 'token', 'platform'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: [],
        where: audienceWhere(audience, userId, userIds),
        required: true,
      },
    ],
    raw: true,
  });
}

async function searchRecipients(search = '') {
  const term = String(search || '').trim();
  const where = { isActive: true };
  if (term) {
    where[Op.or] = [
      { email: { [Op.iLike]: `%${term}%` } },
      { displayName: { [Op.iLike]: `%${term}%` } },
    ];
  }

  const users = await User.findAll({
    where,
    attributes: ['id', 'email', 'displayName', 'photoUrl', 'isPlusSubscriber'],
    order: [['createdAt', 'DESC']],
    limit: RECIPIENT_SEARCH_LIMIT,
  });
  if (!users.length) return [];

  const tokenCounts = await DeviceToken.findAll({
    where: { userId: { [Op.in]: users.map((user) => user.id) } },
    attributes: ['userId', [DeviceToken.sequelize.fn('COUNT', DeviceToken.sequelize.col('token')), 'count']],
    group: ['userId'],
    raw: true,
  });
  const countByUser = new Map(tokenCounts.map((row) => [row.userId, Number(row.count)]));

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    isPlusSubscriber: Boolean(user.isPlusSubscriber),
    deviceCount: countByUser.get(user.id) || 0,
  }));
}

async function countEligibleRecipients(audience) {
  const rows = await findAudienceTokens({ audience });
  return {
    users: new Set(rows.map((row) => row.userId)).size,
    devices: rows.length,
  };
}

async function getPushStats() {
  const fcmStatus = getFcmStatus();

  const [registeredDevices, iosDevices, androidDevices, userIdRows, recentDevices] =
    await Promise.all([
      DeviceToken.count(),
      DeviceToken.count({ where: { platform: 'ios' } }),
      DeviceToken.count({ where: { platform: 'android' } }),
      DeviceToken.findAll({
        attributes: ['userId'],
        group: ['userId'],
        raw: true,
      }),
      DeviceToken.findAll({
        attributes: ['userId', 'token', 'platform', 'updatedAt'],
        include: [{ model: User, as: 'user', attributes: ['email', 'displayName'] }],
        order: [['updatedAt', 'DESC']],
        limit: RECENT_DEVICES_LIMIT,
      }),
    ]);

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
    registeredDevices,
    usersWithTokens: userIdRows.length,
    iosDevices,
    androidDevices,
    audienceCounts,
    devices: recentDevices.map((row) => ({
      userId: row.userId,
      userEmail: row.user?.email || null,
      userName: row.user?.displayName || null,
      platform: row.platform,
      tokenSuffix: row.token.slice(-8),
      updatedAt: row.updatedAt,
    })),
  };
}

function pruneJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs) {
    if (job.finishedAt && job.finishedAt < cutoff) jobs.delete(id);
  }
}

function serializeJob(job) {
  return {
    jobId: job.id,
    status: job.status,
    audience: job.audience,
    title: job.title,
    sent: job.sent,
    failed: job.failed,
    processedTokens: job.processedTokens,
    requestedUsers: job.requestedUsers,
    recipientCount: job.recipientCount,
    tokenCount: job.tokenCount,
    fcmConfigured: true,
    errors: job.errors,
    error: job.error,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}

function getPushJob(jobId) {
  const job = jobs.get(jobId);
  return job ? serializeJob(job) : null;
}

async function recordBroadcastLogs(job, userIds) {
  const rows = userIds.map((userId) => ({
    userId,
    reminderKey: `admin_${job.key}_${userId}`,
    title: job.title,
    body: job.body,
    type: 'admin_broadcast',
  }));

  for (let i = 0; i < rows.length; i += LOG_INSERT_CHUNK) {
    await NotificationLog.bulkCreate(rows.slice(i, i + LOG_INSERT_CHUNK), {
      ignoreDuplicates: true,
    });
  }
}

async function runBroadcast(job, tokenRows, payloadData) {
  const userByToken = new Map(tokenRows.map((row) => [row.token, row.userId]));

  for (let i = 0; i < tokenRows.length; i += SEND_BATCH_SIZE) {
    const batch = tokenRows.slice(i, i + SEND_BATCH_SIZE);
    const result = await sendToTokens(batch, {
      title: job.title,
      body: job.body,
      data: payloadData,
    });

    job.sent += result.sent;
    job.failed += result.failed;
    job.processedTokens += batch.length;
    if (result.errors?.length && job.errors.length < MAX_STORED_ERRORS) {
      job.errors.push(...result.errors.slice(0, MAX_STORED_ERRORS - job.errors.length));
    }

    const deliveredUsers = new Set(
      (result.deliveredTokens || []).map((token) => userByToken.get(token)).filter(Boolean)
    );
    if (deliveredUsers.size) {
      try {
        await recordBroadcastLogs(job, [...deliveredUsers]);
      } catch (err) {
        console.warn('[push] failed to record broadcast inbox rows:', err.message);
      }
    }
  }
}

async function sendAdminPush({ title, body, data = {}, audience = 'all', userId, userIds }) {
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

  const selectedIds =
    audience === 'selected' || userIds != null ? normalizeUserIds(userIds ?? []) : null;
  const tokenRows = await findAudienceTokens({ audience, userId, userIds: selectedIds });
  const recipientCount = new Set(tokenRows.map((row) => row.userId)).size;
  const requestedUsers = selectedIds ? selectedIds.length : userId ? 1 : recipientCount;

  const payloadData = {
    type: 'admin_broadcast',
    ...Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, String(value)])
    ),
  };

  pruneJobs();

  const job = {
    id: crypto.randomUUID(),
    key: Date.now().toString(36),
    status: tokenRows.length ? 'running' : 'done',
    audience: selectedIds ? 'selected' : userId ? 'user' : audience,
    title: trimmedTitle,
    body: trimmedBody,
    sent: 0,
    failed: 0,
    processedTokens: 0,
    requestedUsers,
    recipientCount,
    tokenCount: tokenRows.length,
    errors: [],
    error: null,
    startedAt: Date.now(),
    finishedAt: tokenRows.length ? null : Date.now(),
  };
  jobs.set(job.id, job);

  if (!tokenRows.length) {
    return serializeJob(job);
  }

  const run = runBroadcast(job, tokenRows, payloadData)
    .then(() => {
      job.status = 'done';
    })
    .catch((err) => {
      job.status = 'failed';
      job.error = err.message || String(err);
      console.error('[push] broadcast failed:', err);
    })
    .finally(() => {
      job.finishedAt = Date.now();
    });

  // Give small sends a chance to finish inline so the UI gets the final
  // result in one round trip; otherwise return the job for polling.
  await Promise.race([run, new Promise((resolve) => setTimeout(resolve, INLINE_WAIT_MS))]);

  return serializeJob(job);
}

module.exports = {
  getPushStats,
  getPushJob,
  searchRecipients,
  sendAdminPush,
};
