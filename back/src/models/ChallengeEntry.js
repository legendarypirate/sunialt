const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChallengeEntry = sequelize.define('ChallengeEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  challengeId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'challenge_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  completedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'completed_at',
  },
}, {
  tableName: 'challenge_entries',
  indexes: [{ unique: true, fields: ['challenge_id', 'user_id'] }],
});

module.exports = ChallengeEntry;
