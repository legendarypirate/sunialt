const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Exercise = sequelize.define('Exercise', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  level: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Анхан шат',
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  muscles: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  targetReps: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
    field: 'target_reps',
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'image_url',
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
  tableName: 'exercises',
});

module.exports = Exercise;
