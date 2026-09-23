const APP_TIME_ZONE = process.env.APP_TIME_ZONE || 'Asia/Ulaanbaatar';

function zonedParts(date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = {};
  for (const part of dtf.formatToParts(new Date(date))) {
    if (part.type !== 'literal') parts[part.type] = part.value;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: parts.weekday,
  };
}

function dayKey(date) {
  const p = zonedParts(date);
  return `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

function zoneOffset(date) {
  try {
    const text = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIME_ZONE,
      timeZoneName: 'longOffset',
    }).format(new Date(date));
    const match = String(text).match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (match) {
      return `${match[1]}${match[2].padStart(2, '0')}:${(match[3] || '00').padStart(2, '0')}`;
    }
  } catch (_) {
    // Older Node builds may not support longOffset.
  }
  return '+08:00';
}

function startOfDay(date) {
  const key = dayKey(date);
  const noonUtc = new Date(`${key}T12:00:00.000Z`);
  return new Date(`${key}T00:00:00${zoneOffset(noonUtc)}`);
}

function shiftDayKey(key, days) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function isoWeekKey(date) {
  const p = zonedParts(date);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function mondayIndex(date) {
  const map = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[zonedParts(date).weekday] ?? 0;
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
  const lastParts = zonedParts(last);
  const nowParts = zonedParts(now);
  if (lastParts.month !== nowParts.month || lastParts.year !== nowParts.year) {
    user.monthPushUps = 0;
  }
  if (isoWeekKey(last) !== isoWeekKey(now)) {
    user.weekPushUps = 0;
    user.weekBars = [0, 0, 0, 0, 0, 0, 0];
  }
  if (lastParts.year !== nowParts.year) {
    user.yearBars = Array.from({ length: 12 }, () => 0);
  }
}

async function applyFreshCounters(user, now = new Date()) {
  if (!user) return user;
  const before = {
    todayPushUps: user.todayPushUps,
    weekPushUps: user.weekPushUps,
    monthPushUps: user.monthPushUps,
    weekBars: JSON.stringify(user.weekBars || []),
    yearBars: JSON.stringify(user.yearBars || []),
  };
  rollPeriodCounters(user, now);
  const changed =
    user.todayPushUps !== before.todayPushUps ||
    user.weekPushUps !== before.weekPushUps ||
    user.monthPushUps !== before.monthPushUps ||
    JSON.stringify(user.weekBars || []) !== before.weekBars ||
    JSON.stringify(user.yearBars || []) !== before.yearBars;
  if (changed && typeof user.save === 'function') {
    if (typeof user.changed === 'function') {
      user.changed('weekBars', true);
      user.changed('yearBars', true);
    }
    await user.save();
  }
  return user;
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

  if (shiftDayKey(today, -1) === lastDay) {
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
  yearBars[zonedParts(now).month - 1] += count;

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

const { withProductImages } = require('../utils/productImages');

function formatProductCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon || 'category',
    sortOrder: category.sortOrder || 0,
  };
}

function formatProduct(product) {
  const json = withProductImages(product);
  const price = Number(json.price);
  const cat = product.productCategory;
  return {
    ...json,
    price,
    formattedPrice: `₮ ${price.toLocaleString('en-US')}`,
    rating: Number(json.rating || 0),
    categoryId: json.categoryId || cat?.id || null,
    category: cat?.name || json.category || '',
    tabDescription: json.tabDescription || null,
    tabFeatures: json.tabFeatures || [],
    tabSizeInfo: json.tabSizeInfo || null,
    showTabDescription: json.showTabDescription !== false,
    showTabFeatures: json.showTabFeatures !== false,
    showTabSize: json.showTabSize !== false,
  };
}

module.exports = {
  APP_TIME_ZONE,
  dayKey,
  startOfDay,
  applyFreshCounters,
  recordSession,
  formatProduct,
  formatProductCategory,
};
