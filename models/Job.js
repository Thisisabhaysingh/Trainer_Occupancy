const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Job = sequelize.define(
  "Job",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    projectId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
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
    status: {
      type: DataTypes.ENUM("planned", "active", "completed", "blocked"),
      allowNull: false,
      defaultValue: "planned",
    },
    ownerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    assignedToIds: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    estimatedHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actualHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
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
    tableName: "jobs",
    timestamps: true,
  }
);

module.exports = Job;
