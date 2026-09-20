const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
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
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending',
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'MNT',
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  paymentMethod: {
    type: DataTypes.STRING,
    defaultValue: 'qpay',
    field: 'payment_method',
  },
  paymentStatus: {
    type: DataTypes.STRING,
    defaultValue: 'unpaid',
    field: 'payment_status',
  },
  qpayInvoiceId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'qpay_invoice_id',
  },
  qpayQrImage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'qpay_qr_image',
  },
  qpayDemo: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'qpay_demo',
  },
}, {
  tableName: 'orders',
});

module.exports = Order;
