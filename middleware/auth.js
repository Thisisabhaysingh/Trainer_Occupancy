const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Sequelize User model

const auth = async (req, res, next) => {
  try {
    // Read token from cookie
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: "Please authenticate." });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

    // Find user by primary key (employeeCode)
    const user = await User.findByPk(decoded.employeeCode);

    if (!user) {
      return res.status(401).json({ error: "Please authenticate." });
    }

    req.user = user;

    next();
  } catch (error) {
    console.error("Auth error:", error.message || "Invalid authentication token");
    res.status(401).json({ error: "Please authenticate." });
  }
};

// Role-based access check
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied." });
    }
    next();
  };
};

const requireAdmin = checkRole(["admin"]);

module.exports = { auth, checkRole, requireAdmin };
