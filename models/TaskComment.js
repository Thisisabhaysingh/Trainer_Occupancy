const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const TaskComment = sequelize.define(
  "TaskComment",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    taskId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    authorId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "task_comments",
    timestamps: true,
  }
);

module.exports = TaskComment;
