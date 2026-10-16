const { DataTypes } = require('sequelize');
const sequelize = require('../config/sequelize');

const Template = sequelize.define(
  'Template',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.ENUM('Low', 'Medium', 'High'),
      allowNull: false,
      defaultValue: 'Medium',
    },
    jobs: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    createdById: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    updatedById: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: 'templates',
    timestamps: true,
  }
);

module.exports = Template;
