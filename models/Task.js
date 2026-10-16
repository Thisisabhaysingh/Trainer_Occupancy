const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Task = sequelize.define(
  "Task",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    jobId: {
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
    assigneeId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "critical"),
      allowNull: false,
      defaultValue: "medium",
    },
    estimatedHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actualHours: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    dependencies: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    deadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("todo", "in-progress", "submitted", "review", "approved", "rejected", "completed"),
      allowNull: false,
      defaultValue: "todo",
    },
    submissionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
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
    tableName: "tasks",
    timestamps: true,
  }
);

module.exports = Task;
