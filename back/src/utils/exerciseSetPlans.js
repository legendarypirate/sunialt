const DEFAULT_REST_SECONDS = 60;
const LEGACY_LABELS = ['Эхлэх', 'Стандарт', 'Хүчтэй'];
const LEGACY_FIELDS = ['beginnerPlan', 'standardPlan', 'advancedPlan'];

function clampInt(value, min, max, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parseLegacyPlan(text) {
  const match = String(text || '').match(/(\d+)\s*[×xX*]\s*(\d+)/);
  if (!match) return null;
  return { sets: Number(match[1]), reps: Number(match[2]) };
}

function parseLegacyRest(text) {
  const numbers = String(text || '').match(/\d+/g);
  if (!numbers) return DEFAULT_REST_SECONDS;
  return Number(numbers[numbers.length - 1]);
}

function normalizeSetPlans(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((plan) => ({
      label: String(plan?.label || '').trim(),
      sets: clampInt(plan?.sets, 1, 20, 3),
      reps: clampInt(plan?.reps, 1, 200, 10),
      restSeconds: clampInt(plan?.restSeconds, 0, 600, DEFAULT_REST_SECONDS),
    }))
    .filter((plan) => plan.label);
}

function legacySetPlans(exercise) {
  const restSeconds = parseLegacyRest(exercise.restNote);
  return LEGACY_FIELDS.map((field, index) => {
    const parsed = parseLegacyPlan(exercise[field]);
    if (!parsed) return null;
    return { label: LEGACY_LABELS[index], ...parsed, restSeconds };
  }).filter(Boolean);
}

// Admin input -> DB. Keeps the legacy string columns in sync for older app builds.
function normalizeExerciseSetPlans(body) {
  if (!('setPlans' in body)) return body;
  const plans = normalizeSetPlans(body.setPlans);
  const next = { ...body, setPlans: plans };
  LEGACY_FIELDS.forEach((field, index) => {
    const plan = plans[index];
    if (plan) next[field] = `${plan.sets} × ${plan.reps}`;
  });
  if (plans.length) next.restNote = `Амралт: сет хооронд ${plans[0].restSeconds} сек`;
  return next;
}

// DB -> API. Exercises saved before set plans existed get them from the legacy strings.
function withSetPlans(json) {
  const plans = normalizeSetPlans(json.setPlans);
  return { ...json, setPlans: plans.length ? plans : legacySetPlans(json) };
}

module.exports = {
  normalizeExerciseSetPlans,
  withSetPlans,
};
