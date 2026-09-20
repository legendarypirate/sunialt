const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Workout = sequelize.define('Workout', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  level: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  type: {
    type: DataTypes.ENUM('stretching', 'core', 'recovery', 'push_up'),
    defaultValue: 'stretching',
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
    field: 'duration_minutes',
  },
  rewardMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
    field: 'reward_minutes',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order',
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_published',
  },
}, {
  tableName: 'workouts',
});

module.exports = Workout;
