const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserBadge = sequelize.define('UserBadge', {
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
  badgeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'badge_id',
  },
  earnedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'earned_at',
  },
}, {
  tableName: 'user_badges',
  indexes: [{ unique: true, fields: ['user_id', 'badge_id'] }],
});

module.exports = UserBadge;
