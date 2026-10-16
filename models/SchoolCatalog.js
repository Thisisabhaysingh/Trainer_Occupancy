const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const SchoolCatalog = sequelize.define(
  "SchoolCatalog",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "school_catalog",
    timestamps: true,
  }
);

module.exports = SchoolCatalog;
