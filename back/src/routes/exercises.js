const express = require('express');
const { Exercise } = require('../models');
const { authenticateAdmin } = require('../middleware/auth');
const { normalizeExerciseImages, withExerciseImages } = require('../utils/exerciseImages');

const router = express.Router();
router.use(authenticateAdmin);

router.get('/', async (_req, res) => {
  try {
    const exercises = await Exercise.findAll({ order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
    res.json({ exercises: exercises.map(withExerciseImages) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const exercise = await Exercise.create(normalizeExerciseImages(req.body));
    res.status(201).json({ exercise: withExerciseImages(exercise) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findByPk(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ exercise: withExerciseImages(exercise) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findByPk(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    await exercise.update(normalizeExerciseImages(req.body));
    res.json({ exercise: withExerciseImages(exercise) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const exercise = await Exercise.findByPk(req.params.id);
    if (!exercise) return res.status(404).json({ error: 'Exercise not found' });
    await exercise.destroy();
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
