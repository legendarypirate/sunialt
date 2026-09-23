const MONTHLY_BASELINE = Number(
  process.env.SUBSCRIPTION_PRICE_MONTHLY ||
    process.env.SUBSCRIPTION_PRICE ||
    19900,
);

const PLAN_DEFS = [
  {
    id: "monthly",
    label: "1 сар",
    months: 1,
    price: MONTHLY_BASELINE,
  },
  {
    id: "quarterly",
    label: "3 сар",
    months: 3,
    price: Number(process.env.SUBSCRIPTION_PRICE_QUARTERLY || 39900),
  },
  {
    id: "yearly",
    label: "1 жил",
    months: 12,
    price: Number(process.env.SUBSCRIPTION_PRICE_YEARLY || 129900),
  },
];

function enrichPlan(def) {
  const fullPrice = MONTHLY_BASELINE * def.months;
  const savings = Math.max(0, fullPrice - def.price);
  const savingsPercent =
    fullPrice > 0 ? Math.round((savings / fullPrice) * 100) : 0;
  return {
    id: def.id,
    label: def.label,
    months: def.months,
    price: def.price,
    fullPrice,
    savings,
    savingsPercent,
    planName: `Pro ${def.label}`,
  };
}

function listSubscriptionPlans() {
  return {
    monthlyBaseline: MONTHLY_BASELINE,
    plans: PLAN_DEFS.map(enrichPlan),
  };
}

function getSubscriptionPlan(planId) {
  const def = PLAN_DEFS.find((item) => item.id === planId);
  if (!def) return null;
  return enrichPlan(def);
}

function resolvePlanId(raw) {
  const id = String(raw || "monthly")
    .trim()
    .toLowerCase();
  return PLAN_DEFS.some((item) => item.id === id) ? id : null;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function formatDateOnly(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function buildUserSubscriptionFields(user, planId, { extend = true } = {}) {
  const plan = getSubscriptionPlan(planId);
  if (!plan) {
    const err = new Error(
      "Буруу төлөвлөгөө. Зөвшөөрөгдсөн: monthly, quarterly, yearly",
    );
    err.status = 400;
    throw err;
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let startedAt = today;
  let endBase = today;

  if (extend && user.isPlusSubscriber && user.subscriptionRenewsAt) {
    const currentEnd = new Date(`${user.subscriptionRenewsAt}T12:00:00`);
    if (!Number.isNaN(currentEnd.getTime()) && currentEnd >= today) {
      endBase = currentEnd;
      if (user.subscriptionStartedAt) {
        const existingStart = new Date(
          `${user.subscriptionStartedAt}T12:00:00`,
        );
        if (!Number.isNaN(existingStart.getTime())) {
          startedAt = existingStart;
        }
      }
    }
  }

  const renewsAt = addMonths(endBase, plan.months);

  return {
    isPlusSubscriber: true,
    subscriptionPlan: plan.planName,
    subscriptionStartedAt: formatDateOnly(startedAt),
    subscriptionRenewsAt: formatDateOnly(renewsAt),
  };
}

function buildRevokedSubscriptionFields() {
  return {
    isPlusSubscriber: false,
    subscriptionPlan: null,
    subscriptionStartedAt: null,
    subscriptionRenewsAt: null,
  };
}

module.exports = {
  listSubscriptionPlans,
  getSubscriptionPlan,
  resolvePlanId,
  addMonths,
  buildUserSubscriptionFields,
  buildRevokedSubscriptionFields,
};
