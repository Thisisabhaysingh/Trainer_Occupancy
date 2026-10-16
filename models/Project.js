const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Project = sequelize.define(
  "Project",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
      type: DataTypes.ENUM("planned", "active", "completed", "on-hold", "cancelled"),
      allowNull: false,
      defaultValue: "planned",
    },
    startDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    ownerId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    projectCode: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    selectedTemplateIds: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    departmentId: {
      type: DataTypes.INTEGER,
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
    tableName: "projects",
    timestamps: true,
  }
);

module.exports = Project;
