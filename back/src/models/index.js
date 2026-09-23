const sequelize = require('../config/database');
const Admin = require('./Admin');
const User = require('./User');
const Workout = require('./Workout');
const Challenge = require('./Challenge');
const Product = require('./Product');
const ProductCategory = require('./ProductCategory');
const Exercise = require('./Exercise');
const WorkoutSession = require('./WorkoutSession');
const Badge = require('./Badge');
const UserBadge = require('./UserBadge');
const ChallengeEntry = require('./ChallengeEntry');
const Duel = require('./Duel');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Setting = require('./Setting');

User.hasMany(WorkoutSession, { foreignKey: 'userId', as: 'sessions' });
WorkoutSession.belongsTo(User, { foreignKey: 'userId', as: 'user' });
WorkoutSession.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise' });
WorkoutSession.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });
Exercise.hasMany(WorkoutSession, { foreignKey: 'exerciseId', as: 'sessions' });

User.hasMany(ChallengeEntry, { foreignKey: 'userId', as: 'challengeEntries' });
Challenge.hasMany(ChallengeEntry, { foreignKey: 'challengeId', as: 'entries' });
ChallengeEntry.belongsTo(User, { foreignKey: 'userId', as: 'user' });
ChallengeEntry.belongsTo(Challenge, { foreignKey: 'challengeId', as: 'challenge' });

User.belongsToMany(Badge, { through: UserBadge, foreignKey: 'userId', otherKey: 'badgeId', as: 'badges' });
Badge.belongsToMany(User, { through: UserBadge, foreignKey: 'badgeId', otherKey: 'userId', as: 'users' });
UserBadge.belongsTo(User, { foreignKey: 'userId', as: 'user' });
UserBadge.belongsTo(Badge, { foreignKey: 'badgeId', as: 'badge' });

User.hasMany(Duel, { foreignKey: 'userId', as: 'duels' });
Duel.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Duel.belongsTo(User, { foreignKey: 'opponentId', as: 'opponent' });

User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
ProductCategory.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
Product.belongsTo(ProductCategory, { foreignKey: 'categoryId', as: 'productCategory' });

module.exports = {
  sequelize,
  Admin,
  User,
  Workout,
  Challenge,
  Product,
  ProductCategory,
  Exercise,
  WorkoutSession,
  Badge,
  UserBadge,
  ChallengeEntry,
  Duel,
  Order,
  OrderItem,
  Setting,
};
