const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Challenge = sequelize.define('Challenge', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  kind: {
    type: DataTypes.STRING,
    defaultValue: 'daily',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  timeLimitSeconds: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'time_limit_seconds',
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'image_url',
  },
  rewardText: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reward_text',
  },
  durationDays: {
    type: DataTypes.INTEGER,
    defaultValue: 21,
    field: 'duration_days',
  },
  weeklyGoalDays: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'weekly_goal_days',
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'start_date',
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'end_date',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
}, {
  tableName: 'challenges',
});

module.exports = Challenge;
