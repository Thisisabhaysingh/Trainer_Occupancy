const crypto = require("crypto");

const TOKEN_COOKIE_NAME = "token";
const TOKEN_TTL = "1d";
const TOKEN_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const getJwtSecret = () => process.env.JWT_SECRET || "your-secret-key";
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (email, otp) => crypto
  .createHash("sha256")
  .update(`${normalizeEmail(email)}:${otp}:${getJwtSecret()}`)
  .digest("hex");

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

module.exports = {
  TOKEN_COOKIE_NAME,
  TOKEN_TTL,
  TOKEN_MAX_AGE_MS,
  OTP_TTL_MS,
  OTP_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
  getJwtSecret,
  normalizeEmail,
  createOtp,
  hashOtp,
  getAuthCookieOptions,
};
