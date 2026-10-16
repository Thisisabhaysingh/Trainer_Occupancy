const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");

const Holiday = sequelize.define(
  "Holiday",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATEONLY, // better for holiday dates
      allowNull: false,
    },
    reason: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    createdById: {
      type: DataTypes.STRING, // FK -> User.employeeCode
      allowNull: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    tableName: "holidays",
    // Use a single, named unique index to avoid Sequelize repeatedly adding unnamed UNIQUE constraints
    indexes: [
      {
        name: "uniq_holidays_date",
        unique: true,
        fields: ["date"],
      },
    ],
  }
);

// ==================== Associations ====================
Holiday.belongsTo(require("./User"), { as: "createdBy", foreignKey: "createdById", targetKey: "employeeCode" });

module.exports = Holiday;
