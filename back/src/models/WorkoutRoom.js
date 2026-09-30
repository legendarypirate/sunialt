const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WorkoutRoom = sequelize.define('WorkoutRoom', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(6),
    allowNull: false,
    unique: true,
  },
  hostUserId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'host_user_id',
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '1min',
  },
  maxParticipants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 4,
    field: 'max_participants',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
}, {
  tableName: 'workout_rooms',
  indexes: [{ fields: ['expires_at'] }],
});

module.exports = WorkoutRoom;
