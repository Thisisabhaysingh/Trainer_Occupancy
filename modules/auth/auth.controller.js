const service = require("./auth.service");
const constants = require("./auth.constants");

const login = async (req, res) => {
  const result = await service.login(req.body);
  res.cookie(constants.TOKEN_COOKIE_NAME, result.token, {
    ...constants.getAuthCookieOptions(),
    maxAge: constants.TOKEN_MAX_AGE_MS,
  });
  return res.json({ user: result.user });
};

const requestPasswordReset = async (req, res) => {
  const message = await service.requestPasswordReset(req.body.email);
  return res.json({ message });
};

const resetPassword = async (req, res) => {
  await service.resetPassword(req.body);
  return res.json({ message: "Password reset successfully. Please login with your new password." });
};

const logout = (req, res) => {
  res.clearCookie(constants.TOKEN_COOKIE_NAME, constants.getAuthCookieOptions());
  return res.json({ message: "Logged out successfully" });
};

const me = async (req, res) => res.json(await service.getCurrentUser(req.user.employeeCode));

const changePassword = async (req, res) => {
  await service.changePassword(req.user.employeeCode, req.body);
  return res.json({ message: "Password changed successfully" });
};

module.exports = { login, requestPasswordReset, resetPassword, logout, me, changePassword };
