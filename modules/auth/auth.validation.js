const result = (data, issues) => issues.length
  ? { success: false, error: { issues } }
  : { success: true, data };

const requiredString = (data, field, issues) => {
  const value = String(data?.[field] || "").trim();
  if (!value) issues.push({ path: [field], message: `${field} is required` });
  return value;
};

const loginSchema = {
  safeParse(data) {
    const issues = [];
    const email = requiredString(data, "email", issues).toLowerCase();
    const password = requiredString(data, "password", issues);
    return result({ email, password }, issues);
  },
};

const emailSchema = {
  safeParse(data) {
    const issues = [];
    const email = requiredString(data, "email", issues).toLowerCase();
    return result({ email }, issues);
  },
};

const resetPasswordSchema = {
  safeParse(data) {
    const issues = [];
    const email = requiredString(data, "email", issues).toLowerCase();
    const otp = requiredString(data, "otp", issues);
    const newPassword = requiredString(data, "newPassword", issues);
    if (otp && !/^\d{6}$/.test(otp)) issues.push({ path: ["otp"], message: "Enter a valid 6-digit OTP" });
    if (newPassword && newPassword.length < 6) issues.push({ path: ["newPassword"], message: "Password must be at least 6 characters" });
    return result({ email, otp, newPassword }, issues);
  },
};

const changePasswordSchema = {
  safeParse(data) {
    const issues = [];
    const oldPassword = requiredString(data, "oldPassword", issues);
    const newPassword = requiredString(data, "newPassword", issues);
    if (newPassword && newPassword.length < 6) issues.push({ path: ["newPassword"], message: "Password must be at least 6 characters" });
    return result({ oldPassword, newPassword }, issues);
  },
};

module.exports = { loginSchema, emailSchema, resetPasswordSchema, changePasswordSchema };
