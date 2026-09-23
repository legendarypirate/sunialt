const MONTHLY_BASELINE = Number(process.env.SUBSCRIPTION_PRICE_MONTHLY || process.env.SUBSCRIPTION_PRICE || 19900);

const PLAN_DEFS = [
  {
    id: 'monthly',
    label: '1 сар',
    months: 1,
    price: MONTHLY_BASELINE,
  },
  {
    id: 'quarterly',
    label: '3 сар',
    months: 3,
    price: Number(process.env.SUBSCRIPTION_PRICE_QUARTERLY || 29900),
  },
  {
    id: 'yearly',
    label: '1 жил',
    months: 12,
    price: Number(process.env.SUBSCRIPTION_PRICE_YEARLY || 129900),
  },
];

function enrichPlan(def) {
  const fullPrice = MONTHLY_BASELINE * def.months;
  const savings = Math.max(0, fullPrice - def.price);
  const savingsPercent = fullPrice > 0 ? Math.round((savings / fullPrice) * 100) : 0;
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
  const id = String(raw || 'monthly').trim().toLowerCase();
  return PLAN_DEFS.some((item) => item.id === id) ? id : null;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

module.exports = {
  listSubscriptionPlans,
  getSubscriptionPlan,
  resolvePlanId,
  addMonths,
};
