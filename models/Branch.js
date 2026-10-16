const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

// ==================== Branch Model ====================
const Branch = sequelize.define("Branch", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    // Removed unique: true to avoid hitting MySQL's 64-index limit
    // Uniqueness will be enforced at application level if needed
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  managerId: {
    type: DataTypes.STRING, // FK -> User.employeeCode
    allowNull: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Branch;
