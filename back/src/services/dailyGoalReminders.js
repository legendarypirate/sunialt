const { User, DeviceToken, NotificationLog } = require('../models');
const { sendToTokens, isFcmConfigured } = require('./fcm');
const { applyFreshCounters, dayKey } = require('./stats');
const { APP_TIME_ZONE, isExactLocalTime } = require('../utils/timezone');

const REMINDER_HOUR = Number(process.env.DAILY_GOAL_REMINDER_HOUR ?? 19);
const REMINDER_MINUTE = Number(process.env.DAILY_GOAL_REMINDER_MINUTE ?? 30);
const REMINDER_TITLE = process.env.DAILY_GOAL_REMINDER_TITLE || 'Suniagch';

function buildReminderBody(remaining) {
  return `Өнөөдрийн норм биелүүлэхэд ${remaining} дутуу байна. Та дасгалаа хийнэ үү`;
}

function reminderKeyForDate(dateKey) {
  const minute = String(REMINDER_MINUTE).padStart(2, '0');
  return `daily_goal_${REMINDER_HOUR}${minute}_${dateKey}`;
}

async function processDailyGoalReminders(now = new Date(), { force = false } = {}) {
  if (!isFcmConfigured()) {
    return { skipped: 'fcm-not-configured' };
  }

  const forced = force || process.env.FORCE_DAILY_GOAL_REMINDER === '1';
  if (!forced && !isExactLocalTime(REMINDER_HOUR, REMINDER_MINUTE, now, APP_TIME_ZONE)) {
    return { skipped: 'not-scheduled-minute' };
  }

  const dateKey = dayKey(now);
  const reminderKey = reminderKeyForDate(dateKey);

  const users = await User.findAll({
    where: { isActive: true },
    include: [{
      model: DeviceToken,
      as: 'deviceTokens',
      attributes: ['token', 'platform'],
      required: true,
    }],
  });

  let sent = 0;
  let skippedGoalMet = 0;
  let skippedAlreadySent = 0;
  let failed = 0;

  for (const user of users) {
    await applyFreshCounters(user, now);

    const goal = Math.max(0, Number(user.dailyGoalReps) || 0);
    const today = Math.max(0, Number(user.todayPushUps) || 0);
    if (goal <= 0 || today >= goal) {
      skippedGoalMet += 1;
      continue;
    }

    const existing = await NotificationLog.findOne({
      where: { userId: user.id, reminderKey },
    });
    if (existing) {
      skippedAlreadySent += 1;
      continue;
    }

    const remaining = goal - today;
    const title = REMINDER_TITLE;
    const body = buildReminderBody(remaining);

    const result = await sendToTokens(user.deviceTokens, {
      title,
      body,
      data: {
        type: 'daily_goal_reminder',
        remaining: String(remaining),
        goal: String(goal),
        today: String(today),
      },
    });

    if (result.sent > 0) {
      await NotificationLog.create({ userId: user.id, reminderKey, title, body });
      sent += 1;
    } else {
      failed += 1;
    }
  }

  const summary = {
    dateKey,
    sent,
    skippedGoalMet,
    skippedAlreadySent,
    failed,
    checked: users.length,
  };
  console.log(`[DailyGoal] ${dateKey} ${JSON.stringify(summary)}`);
  return summary;
}

module.exports = {
  processDailyGoalReminders,
  buildReminderBody,
  reminderKeyForDate,
};
