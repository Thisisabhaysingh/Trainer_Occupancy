const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/sequelize");

const User = sequelize.define(
  "User",
  {
    employeeCode: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
        // Note: Email uniqueness will be enforced at application level
        // Database-level uniqueness removed to avoid 64-index limit
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("admin", "manager", "senior_manager", "teamlead", "employee", "inventory_admin"),
      allowNull: false,
    },
    managerType: {
      type: DataTypes.ENUM('branch', 'department'),
      allowNull: true,
      comment: 'Type of manager: branch or department',
      validate: {
        isIn: {
          args: [['branch', 'department']],
          msg: 'Manager type must be either "branch" or "department"'
        }
      }
    },
    departmentId: {
      type: DataTypes.INTEGER, // FK -> Department
      allowNull: true,
    },
    branchId: {
      type: DataTypes.INTEGER, // FK -> Branch
      allowNull: true,
    },
    teamLeadId: {
      type: DataTypes.STRING, // FK -> User.employeeCode (role: teamlead)
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
    hooks: {
      // ✅ Hash password before saving
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 10);
        }
      },
    },
    tableName: "users",
    // Note: No additional indexes added to avoid 64-index MySQL limit
    // Email uniqueness will be enforced at application level through validation
  }
);

// ✅ Custom instance method (like comparePassword)
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;
