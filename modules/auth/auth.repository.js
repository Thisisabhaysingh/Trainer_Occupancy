const { Op } = require("sequelize");
const { User, Department, PasswordResetOtp } = require("../../models");

const findUserForLogin = (email) => User.findOne({
  where: { email },
  include: [{ model: Department, as: "department" }],
});

const findUserByEmail = (email) => User.findOne({ where: { email } });
const findUserByEmployeeCode = (employeeCode, options = {}) => User.findByPk(employeeCode, options);

const findCurrentUser = (employeeCode) => User.findByPk(employeeCode, {
  attributes: { exclude: ["password"] },
  include: [{ model: Department, as: "department", attributes: ["id", "name"] }],
});

const findRecentOtp = (email, cooldownMs) => PasswordResetOtp.findOne({
  where: { email, usedAt: null, createdAt: { [Op.gt]: new Date(Date.now() - cooldownMs) } },
  order: [["createdAt", "DESC"]],
});

const findActiveOtp = (email) => PasswordResetOtp.findOne({
  where: { email, usedAt: null, expiresAt: { [Op.gt]: new Date() } },
  order: [["createdAt", "DESC"]],
});

const invalidateOtps = (email) => PasswordResetOtp.update({ usedAt: new Date() }, { where: { email, usedAt: null } });
const createPasswordResetOtp = (values) => PasswordResetOtp.create(values);

module.exports = {
  findUserForLogin,
  findUserByEmail,
  findUserByEmployeeCode,
  findCurrentUser,
  findRecentOtp,
  findActiveOtp,
  invalidateOtps,
  createPasswordResetOtp,
};
