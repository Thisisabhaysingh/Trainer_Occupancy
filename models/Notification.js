const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('message', 'notification'),
      allowNull: false,
      defaultValue: 'notification',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: 'notifications',
    timestamps: true,
  }
);

module.exports = Notification;
