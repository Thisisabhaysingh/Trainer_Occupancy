const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

// ==================== Department Model ====================
const Department = sequelize.define(
  "Department",
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
    description: {
      type: DataTypes.STRING,
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#4285F4',
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    branchId: {
      type: DataTypes.INTEGER, // FK -> Branch
      allowNull: true,
    },
    teamLeadId: {
      type: DataTypes.STRING, // FK -> User.employeeCode (role: teamlead)
      allowNull: true,
    },
    managerId: {
      type: DataTypes.STRING, // FK -> User.employeeCode (role: manager)
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
  },
  {
    tableName: "departments",
    timestamps: true,
    // Use a single, named unique index to avoid Sequelize repeatedly adding unnamed UNIQUE constraints
    indexes: [
      {
        name: "uniq_departments_name",
        unique: true,
        fields: ["name"],
      },
    ],
  }
);

module.exports = Department;
 