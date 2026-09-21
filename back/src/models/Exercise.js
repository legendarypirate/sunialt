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
  videoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'video_url',
  },
  videoLabel: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'video_label',
    defaultValue: 'Дасгалын бичлэг',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  primaryMuscles: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'primary_muscles',
  },
  secondaryMuscles: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'secondary_muscles',
  },
  muscleImageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'muscle_image_url',
  },
  whyPoints: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
    field: 'why_points',
  },
  howPoints: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
    field: 'how_points',
  },
  beginnerPlan: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'beginner_plan',
    defaultValue: '3 × 8',
  },
  standardPlan: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'standard_plan',
    defaultValue: '3 × 12',
  },
  advancedPlan: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'advanced_plan',
    defaultValue: '4 × 15',
  },
  restNote: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'rest_note',
    defaultValue: 'Амралт: сет хооронд 45–60 сек',
  },
  mistakes: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: [],
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
