const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeviceToken = sequelize.define('DeviceToken', {
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
  token: {
    type: DataTypes.STRING(512),
    allowNull: false,
    unique: true,
  },
  platform: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'unknown',
  },
}, {
  tableName: 'device_tokens',
  indexes: [{ fields: ['user_id'] }],
});

module.exports = DeviceToken;
