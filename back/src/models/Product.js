const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'Суниалтын төхөөрөмж',
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'category_id',
  },
  rating: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 0,
  },
  reviews: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'MNT',
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'image_url',
  },
  imageUrls: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    field: 'image_urls',
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  isPublished: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_published',
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'sort_order',
  },
  tabDescription: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'tab_description',
  },
  tabFeatures: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    field: 'tab_features',
  },
  tabSizeInfo: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'tab_size_info',
  },
  showTabDescription: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'show_tab_description',
  },
  showTabFeatures: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'show_tab_features',
  },
  showTabSize: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'show_tab_size',
  },
}, {
  tableName: 'products',
});

module.exports = Product;
