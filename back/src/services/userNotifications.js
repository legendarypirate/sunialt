const { NotificationLog } = require('../models');

function formatNotification(row) {
  return {
    id: row.id,
    title: row.title || '',
    body: row.body || '',
    type: row.type || 'system',
    read: row.readAt != null,
    createdAt: row.createdAt,
  };
}

async function listUserNotifications(userId, { limit = 50 } = {}) {
  const rows = await NotificationLog.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: Math.min(Math.max(Number(limit) || 50, 1), 100),
  });

  const unreadCount = await NotificationLog.count({
    where: { userId, readAt: null },
  });

  return {
    notifications: rows.map(formatNotification),
    unreadCount,
  };
}

async function markNotificationRead(userId, notificationId) {
  const row = await NotificationLog.findOne({
    where: { id: notificationId, userId },
  });
  if (!row) return null;
  if (!row.readAt) {
    row.readAt = new Date();
    await row.save();
  }
  return formatNotification(row);
}

async function markAllNotificationsRead(userId) {
  const [updated] = await NotificationLog.update(
    { readAt: new Date() },
    { where: { userId, readAt: null } }
  );
  return updated;
}

async function recordUserNotification({
  userId,
  reminderKey,
  title,
  body,
  type = 'system',
}) {
  const existing = await NotificationLog.findOne({
    where: { userId, reminderKey },
  });
  if (existing) return formatNotification(existing);

  const row = await NotificationLog.create({
    userId,
    reminderKey,
    title,
    body,
    type,
  });
  return formatNotification(row);
}

module.exports = {
  listUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  recordUserNotification,
  formatNotification,
};
