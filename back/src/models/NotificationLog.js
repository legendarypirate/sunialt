const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotificationLog = sequelize.define('NotificationLog', {
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
  reminderKey: {
    type: DataTypes.STRING(128),
    allowNull: false,
    field: 'reminder_key',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  body: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  tableName: 'notification_logs',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'reminder_key'],
    },
  ],
});

module.exports = NotificationLog;
