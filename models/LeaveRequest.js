const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const User = require("./User");

const LeaveRequest = sequelize.define(
  "LeaveRequest",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    reason: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM("pending", "approved", "rejected"), defaultValue: "pending" },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { tableName: "leave_requests" }
);

LeaveRequest.belongsTo(User, { as: "employee", foreignKey: { name: "employeeId", allowNull: false }, targetKey: "employeeCode", onDelete: "CASCADE" });
User.hasMany(LeaveRequest, { as: "leaveRequests", foreignKey: "employeeId", sourceKey: "employeeCode" });

module.exports = LeaveRequest;












