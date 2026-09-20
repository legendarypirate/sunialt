function dayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function mondayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function copyBars(value, length, fallback = 0) {
  const next = Array.from({ length }, (_, i) => Number((value && value[i]) || fallback));
  return next;
}

function rollPeriodCounters(user, now) {
  const last = user.lastWorkoutAt ? new Date(user.lastWorkoutAt) : null;
  if (!last) return;

  if (dayKey(last) !== dayKey(now)) {
    user.todayPushUps = 0;
  }
  if (last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear()) {
    user.monthPushUps = 0;
  }
  if (isoWeekKey(last) !== isoWeekKey(now)) {
    user.weekPushUps = 0;
    user.weekBars = [0, 0, 0, 0, 0, 0, 0];
  }
  if (last.getFullYear() !== now.getFullYear()) {
    user.yearBars = Array.from({ length: 12 }, () => 0);
  }
}

function applyStreak(user, now) {
  const last = user.lastWorkoutAt ? new Date(user.lastWorkoutAt) : null;
  if (!last) {
    user.streakDays = Math.max(user.streakDays || 0, 1);
    user.workoutDays = Math.max(user.workoutDays || 0, 1);
    return;
  }

  const today = dayKey(now);
  const lastDay = dayKey(last);
  if (lastDay === today) return;

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dayKey(yesterday) === lastDay) {
    user.streakDays = (user.streakDays || 0) + 1;
  } else {
    user.streakDays = 1;
  }
  user.workoutDays = (user.workoutDays || 0) + 1;
}

async function recordSession(models, user, payload) {
  const {
    WorkoutSession,
    ChallengeEntry,
  } = models;
  const count = Math.max(0, Number(payload.repCount) || 0);
  if (count <= 0) {
    throw new Error('repCount must be greater than 0');
  }

  const now = payload.completedAt ? new Date(payload.completedAt) : new Date();
  rollPeriodCounters(user, now);
  applyStreak(user, now);

  const weekBars = copyBars(user.weekBars, 7);
  const yearBars = copyBars(user.yearBars, 12);
  weekBars[mondayIndex(now)] += count;
  yearBars[now.getMonth()] += count;

  user.todayPushUps = (user.todayPushUps || 0) + count;
  user.weekPushUps = (user.weekPushUps || 0) + count;
  user.monthPushUps = (user.monthPushUps || 0) + count;
  user.totalPushUps = (user.totalPushUps || 0) + count;
  user.completedWorkouts = (user.completedWorkouts || 0) + 1;
  user.weekBars = weekBars;
  user.yearBars = yearBars;
  user.lastWorkoutAt = now;
  user.changed('weekBars', true);
  user.changed('yearBars', true);

  const session = await WorkoutSession.create({
    userId: user.id,
    exerciseId: payload.exerciseId || null,
    challengeId: payload.challengeId || null,
    exerciseTitle: payload.exerciseTitle || 'Энгийн суниалт',
    repCount: count,
    durationSeconds: payload.durationSeconds || null,
    timeLimitSeconds: payload.timeLimitSeconds || null,
    source: payload.source || 'workout',
    completedAt: now,
  });

  if (payload.challengeId) {
    const existing = await ChallengeEntry.findOne({
      where: { challengeId: payload.challengeId, userId: user.id },
    });
    if (existing) {
      existing.score = Math.max(existing.score, count);
      existing.completedAt = now;
      await existing.save();
    } else {
      await ChallengeEntry.create({
        challengeId: payload.challengeId,
        userId: user.id,
        score: count,
        completedAt: now,
      });
    }
  }

  await user.save();
  return session;
}

function formatProduct(product) {
  const json = product.toJSON ? product.toJSON() : product;
  const price = Number(json.price);
  return {
    ...json,
    price,
    formattedPrice: `₮ ${price.toLocaleString('en-US')}`,
    rating: Number(json.rating || 0),
  };
}

module.exports = {
  dayKey,
  recordSession,
  formatProduct,
};
