function normalizeExerciseImages(input = {}) {
  const body = { ...input };
  const legacy = String(body.imageUrl || '').trim();
  const profile = String(body.profileImageUrl || '').trim();
  const cover = String(body.coverImageUrl || '').trim();

  body.profileImageUrl = profile || legacy || null;
  body.coverImageUrl = cover || legacy || null;
  body.imageUrl = body.coverImageUrl || body.profileImageUrl || null;
  return body;
}

function withExerciseImages(exercise) {
  const json = exercise.toJSON ? exercise.toJSON() : { ...exercise };
  return normalizeExerciseImages(json);
}

module.exports = {
  normalizeExerciseImages,
  withExerciseImages,
};
