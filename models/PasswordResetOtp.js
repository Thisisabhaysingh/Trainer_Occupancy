const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const PasswordResetOtp = sequelize.define(
  'PasswordResetOtp',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    otpHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'password_reset_otps',
    timestamps: true,
  }
);

module.exports = PasswordResetOtp;
