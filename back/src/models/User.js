const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  publicId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    unique: true,
    field: 'public_id',
  },
  googleId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
    field: 'google_id',
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  displayName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'display_name',
  },
  tagline: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  photoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'photo_url',
  },
  dailyGoalReps: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    field: 'daily_goal_reps',
  },
  todayPushUps: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'today_push_ups',
  },
  weekPushUps: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'week_push_ups',
  },
  monthPushUps: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'month_push_ups',
  },
  totalPushUps: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_push_ups',
  },
  streakDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'streak_days',
  },
  workoutDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'workout_days',
  },
  completedWorkouts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'completed_workouts',
  },
  earnedMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'earned_minutes',
  },
  weekBars: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [0, 0, 0, 0, 0, 0, 0],
    field: 'week_bars',
  },
  yearBars: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    defaultValue: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    field: 'year_bars',
  },
  lastWorkoutAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_workout_at',
  },
  isPlusSubscriber: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_plus_subscriber',
  },
  subscriptionPlan: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'subscription_plan',
  },
  subscriptionRenewsAt: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'subscription_renews_at',
  },
  heightCm: {
    type: DataTypes.INTEGER,
    defaultValue: 175,
    field: 'height_cm',
  },
  weightKg: {
    type: DataTypes.INTEGER,
    defaultValue: 72,
    field: 'weight_kg',
  },
  age: {
    type: DataTypes.INTEGER,
    defaultValue: 24,
  },
  fitnessLevel: {
    type: DataTypes.STRING,
    defaultValue: 'Дунд шат',
    field: 'fitness_level',
  },
  goalWeightKg: {
    type: DataTypes.INTEGER,
    defaultValue: 70,
    field: 'goal_weight_kg',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'users',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password') && user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

User.prototype.validatePassword = function (password) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(password, this.password);
};

User.prototype.toPublicJSON = function () {
  const json = this.toJSON();
  delete json.password;
  return json;
};

module.exports = User;
