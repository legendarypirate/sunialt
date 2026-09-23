const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Duel = sequelize.define('Duel', {
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
  opponentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'opponent_id',
  },
  opponentName: {
    type: DataTypes.STRING,
    defaultValue: 'Шууд',
    field: 'opponent_name',
  },
  userScore: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'user_score',
  },
  opponentScore: {
    type: DataTypes.INTEGER,
    defaultValue: 28,
    field: 'opponent_score',
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'finished',
  },
}, {
  tableName: 'duels',
});

module.exports = Duel;
