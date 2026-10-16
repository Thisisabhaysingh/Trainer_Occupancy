const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize"); // Sequelize instance
const User = require("./User"); // Import User model for association

const Workday = sequelize.define("Workday", {
  userId: {
    type: DataTypes.STRING, // FK -> User.employeeCode
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY, // ✅ Only date part
    allowNull: false,
  },
  attendanceType: {
    type: DataTypes.ENUM('full_day', 'half_day', 'leave'),
    allowNull: false,
    defaultValue: 'full_day',
  },
  clockIn: {
    type: DataTypes.DATE, // ✅ Full timestamp (deprecated - kept for backward compatibility)
    allowNull: true,
  },
  clockOut: {
    type: DataTypes.DATE, // (deprecated - kept for backward compatibility)
    allowNull: true,
  },
  standardHours: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 9.0, // Full day = 9 hours, Half day = 4.5 hours, Leave = 0 hours
  },
});

// ✅ Associations
Workday.belongsTo(User, {
  foreignKey: { name: "userId", allowNull: false },
  targetKey: "employeeCode",
  onDelete: "CASCADE",
});
User.hasMany(Workday, { foreignKey: "userId", sourceKey: "employeeCode" });

module.exports = Workday;
