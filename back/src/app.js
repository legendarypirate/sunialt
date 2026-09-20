const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
const workoutRoutes = require('./routes/workouts');
const challengeRoutes = require('./routes/challenges');
const productRoutes = require('./routes/products');
const exerciseRoutes = require('./routes/exercises');
const sessionRoutes = require('./routes/sessions');
const badgeRoutes = require('./routes/badges');
const leaderboardRoutes = require('./routes/leaderboard');
const duelRoutes = require('./routes/duels');
const orderRoutes = require('./routes/orders');
const settingsRoutes = require('./routes/settings');
const mobileRoutes = require('./routes/mobile');

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    const allowed = [
      process.env.ADMIN_URL || 'http://localhost:3070',
    ];
    callback(null, allowed.includes(origin));
  },
  credentials: true,
}));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sunialt-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/duels', duelRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/mobile', mobileRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
