const jwt = require("jsonwebtoken");
const repository = require("./auth.repository");
const constants = require("./auth.constants");
const { sendBrandedEmail } = require("../../services/emailService");

class AuthServiceError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AuthServiceError";
    this.statusCode = statusCode;
  }
}

const serializeLoginUser = (user) => {
  const responseUser = { employeeCode: user.employeeCode, name: user.name, email: user.email, role: user.role };
  if (user.role !== "admin" && user.department) responseUser.department = user.department.id;
  if (user.branchId) responseUser.branchId = user.branchId;
  return responseUser;
};

const login = async ({ email, password }) => {
  const user = await repository.findUserForLogin(email);
  if (!user || !(await user.comparePassword(password))) throw new AuthServiceError("Invalid credentials", 401);
  const token = jwt.sign({ employeeCode: user.employeeCode }, constants.getJwtSecret(), { expiresIn: constants.TOKEN_TTL });
  return { token, user: serializeLoginUser(user) };
};

const authenticateToken = async (token) => {
  if (!token) throw new AuthServiceError("Please authenticate.", 401);
  try {
    const decoded = jwt.verify(token, constants.getJwtSecret());
    const user = await repository.findUserByEmployeeCode(decoded.employeeCode);
    if (!user) throw new AuthServiceError("Please authenticate.", 401);
    return user;
  } catch (error) {
    if (error instanceof AuthServiceError) throw error;
    throw new AuthServiceError("Please authenticate.", 401);
  }
};

const getCurrentUser = async (employeeCode) => {
  const user = await repository.findCurrentUser(employeeCode);
  if (!user) throw new AuthServiceError("User not found", 404);
  return user;
};

const requestPasswordReset = async (email) => {
  const genericMessage = "If this email exists, an OTP has been sent.";
  const user = await repository.findUserByEmail(email);
  if (!user) return genericMessage;
  if (await repository.findRecentOtp(email, constants.OTP_COOLDOWN_MS)) {
    throw new AuthServiceError("Please wait before requesting another OTP.", 429);
  }
  await repository.invalidateOtps(email);
  const otp = constants.createOtp();
  await repository.createPasswordResetOtp({
    email,
    otpHash: constants.hashOtp(email, otp),
    expiresAt: new Date(Date.now() + constants.OTP_TTL_MS),
  });
  const mailResult = await sendBrandedEmail({
    to: user.email,
    subject: "OMOTEC MIS password reset OTP",
    title: "Password reset OTP",
    intro: `Hello ${user.name || user.employeeCode}, use this OTP to reset your MIS password.`,
    bodyHtml: `<div style="padding:16px;border:1px solid #EAECF0;border-radius:8px;background:#F9FAFB;text-align:center;"><div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#101828;">${otp}</div><div style="margin-top:8px;font-size:13px;color:#667085;">This OTP is valid for 10 minutes.</div></div>`,
  });
  if (mailResult?.skipped) throw new AuthServiceError("Email service is not configured. Please contact admin.", 500);
  return genericMessage;
};

const resetPassword = async ({ email, otp, newPassword }) => {
  const resetOtp = await repository.findActiveOtp(email);
  if (!resetOtp) throw new AuthServiceError("OTP expired or invalid. Please request a new OTP.");
  if (resetOtp.attempts >= constants.OTP_MAX_ATTEMPTS) {
    await resetOtp.update({ usedAt: new Date() });
    throw new AuthServiceError("Too many attempts. Please request a new OTP.");
  }
  if (resetOtp.otpHash !== constants.hashOtp(email, otp)) {
    await resetOtp.increment("attempts");
    throw new AuthServiceError("Invalid OTP");
  }
  const user = await repository.findUserByEmail(email);
  if (!user) throw new AuthServiceError("OTP expired or invalid. Please request a new OTP.");
  user.password = newPassword;
  await user.save();
  await resetOtp.update({ usedAt: new Date() });
};

const changePassword = async (employeeCode, { oldPassword, newPassword }) => {
  const user = await repository.findUserByEmployeeCode(employeeCode);
  if (!user) throw new AuthServiceError("User not found", 404);
  if (!(await user.comparePassword(oldPassword))) throw new AuthServiceError("Old password is incorrect");
  user.password = newPassword;
  await user.save();
};

module.exports = { AuthServiceError, login, authenticateToken, getCurrentUser, requestPasswordReset, resetPassword, changePassword };
