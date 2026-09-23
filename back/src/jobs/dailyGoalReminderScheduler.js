const cron = require('node-cron');
const { processDailyGoalReminders } = require('../services/dailyGoalReminders');
const { APP_TIME_ZONE } = require('../utils/timezone');

const REMINDER_HOUR = Number(process.env.DAILY_GOAL_REMINDER_HOUR ?? 19);
const REMINDER_MINUTE = Number(process.env.DAILY_GOAL_REMINDER_MINUTE ?? 30);

let started = false;

function startDailyGoalReminderScheduler() {
  if (started) return;
  started = true;

  cron.schedule('* * * * *', async () => {
    try {
      await processDailyGoalReminders();
    } catch (err) {
      console.error('[DailyGoal] scheduler error:', err);
    }
  });

  const minute = String(REMINDER_MINUTE).padStart(2, '0');
  console.log(
    `[DailyGoal] Reminder scheduler started (${REMINDER_HOUR}:${minute} ${APP_TIME_ZONE}, checked every minute)`
  );
}

module.exports = { startDailyGoalReminderScheduler };
