const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { User, Department, Branch, PasswordResetOtp } = require("../models"); // Sequelize models
const { auth } = require("../middleware/auth");
const { sendBrandedEmail } = require("../services/emailService");

const isProduction = process.env.NODE_ENV === "production";
const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
  path: "/",
};

// ==================== Note: Default users are now created via init:production script ====================
// Run: npm run init:production to create default users and data
const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const hashOtp = (email, otp) => crypto
  .createHash('sha256')
  .update(`${normalizeEmail(email)}:${otp}:${process.env.JWT_SECRET || 'your-secret-key'}`)
  .digest('hex');
const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// ==================== Login ====================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email }, include: [{ model: Department, as: "department" }] });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    // Compare password (bcrypt in Sequelize hook)
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    // Generate token
    const token = jwt.sign(
      { employeeCode: user.employeeCode },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "1d" }
    );

    // Send token in cookie
    res.cookie("token", token, {
      ...authCookieOptions,
      maxAge: 24 * 60 * 60 * 1000,
    });

    // Response
    const responseUser = {
      employeeCode: user.employeeCode,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    if (user.role !== "admin" && user.department) {
      responseUser.department = user.department.id;
    }
    
    if (user.branchId) {
      responseUser.branchId = user.branchId;
    }

    res.json({ user: responseUser });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ==================== Forgot Password: Request OTP ====================
router.post("/forgot-password/request-otp", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const genericMessage = "If this email exists, an OTP has been sent.";
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.json({ message: genericMessage });
    }

    const recentOtp = await PasswordResetOtp.findOne({
      where: {
        email,
        usedAt: null,
        createdAt: { [Op.gt]: new Date(Date.now() - 60 * 1000) },
      },
      order: [["createdAt", "DESC"]],
    });

    if (recentOtp) {
      return res.status(429).json({ error: "Please wait before requesting another OTP." });
    }

    await PasswordResetOtp.update(
      { usedAt: new Date() },
      { where: { email, usedAt: null } }
    );

    const otp = createOtp();
    await PasswordResetOtp.create({
      email,
      otpHash: hashOtp(email, otp),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const mailResult = await sendBrandedEmail({
      to: user.email,
      subject: "OMOTEC MIS password reset OTP",
      title: "Password reset OTP",
      intro: `Hello ${user.name || user.employeeCode}, use this OTP to reset your MIS password.`,
      bodyHtml: `
        <div style="padding:16px;border:1px solid #EAECF0;border-radius:8px;background:#F9FAFB;text-align:center;">
          <div style="font-size:32px;letter-spacing:8px;font-weight:700;color:#101828;">${otp}</div>
          <div style="margin-top:8px;font-size:13px;color:#667085;">This OTP is valid for 10 minutes.</div>
        </div>
      `,
    });

    if (mailResult?.skipped) {
      return res.status(500).json({ error: "Email service is not configured. Please contact admin." });
    }

    res.json({ message: genericMessage });
  } catch (error) {
    console.error("Forgot password OTP error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ==================== Forgot Password: Reset With OTP ====================
router.post("/forgot-password/reset", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();
    const newPassword = String(req.body.newPassword || '');

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password are required" });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "Enter a valid 6-digit OTP" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const resetOtp = await PasswordResetOtp.findOne({
      where: {
        email,
        usedAt: null,
        expiresAt: { [Op.gt]: new Date() },
      },
      order: [["createdAt", "DESC"]],
    });

    if (!resetOtp) {
      return res.status(400).json({ error: "OTP expired or invalid. Please request a new OTP." });
    }

    if (resetOtp.attempts >= 5) {
      await resetOtp.update({ usedAt: new Date() });
      return res.status(400).json({ error: "Too many attempts. Please request a new OTP." });
    }

    if (resetOtp.otpHash !== hashOtp(email, otp)) {
      await resetOtp.increment("attempts");
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "OTP expired or invalid. Please request a new OTP." });
    }

    user.password = newPassword;
    await user.save();
    await resetOtp.update({ usedAt: new Date() });

    res.json({ message: "Password reset successfully. Please login with your new password." });
  } catch (error) {
    console.error("Forgot password reset error:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ==================== Logout ====================
router.post("/logout", (req, res) => {
  res.clearCookie("token", authCookieOptions);
  res.json({ message: "Logged out successfully" });
});

// ==================== Get Current User ====================
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.employeeCode, {
      attributes: { exclude: ["password"] },
      include: [
        { model: Department, as: "department", attributes: ["id", "name"] },
        { model: Branch, as: "branch", attributes: ["id", "name", "location"] },
      ],
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// ==================== Change Password ====================
router.post("/change-password", auth, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Old and new password are required" });
    }

    const user = await User.findByPk(req.user.employeeCode);
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) return res.status(400).json({ error: "Old password is incorrect" });

    user.password = newPassword;
    await user.save(); // hook will hash it
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

module.exports = router;
