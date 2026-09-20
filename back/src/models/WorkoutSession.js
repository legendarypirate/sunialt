const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkoutSession = sequelize.define('WorkoutSession', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  exerciseId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'exercise_id',
  },
  challengeId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'challenge_id',
  },
  exerciseTitle: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'exercise_title',
  },
  repCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'rep_count',
  },
  durationSeconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'duration_seconds',
  },
  timeLimitSeconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'time_limit_seconds',
  },
  source: {
    type: DataTypes.STRING,
    defaultValue: 'workout',
  },
  completedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'completed_at',
  },
}, {
  tableName: 'workout_sessions',
});

module.exports = WorkoutSession;
