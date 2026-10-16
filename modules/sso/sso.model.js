const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize");

const SsoAuthorizationCode = sequelize.define("SsoAuthorizationCode", {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  codeHash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  clientId: { type: DataTypes.STRING(100), allowNull: false },
  employeeCode: { type: DataTypes.STRING(255), allowNull: false },
  redirectUri: { type: DataTypes.STRING(1000), allowNull: false },
  codeChallenge: { type: DataTypes.STRING(128), allowNull: false },
  codeChallengeMethod: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "S256" },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  usedAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: "sso_authorization_codes",
  indexes: [
    { fields: ["clientId", "employeeCode"] },
    { fields: ["expiresAt"] },
  ],
});

module.exports = SsoAuthorizationCode;
