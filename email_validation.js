// IMPORTANT: Email Uniqueness Validation
// Since we removed database-level email uniqueness to avoid the 64-index limit,
// you should add this validation to any routes that create users:

// Example validation middleware for email uniqueness:
const validateEmailUniqueness = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Validation error' });
  }
};

// Add this middleware to any user creation routes:
// router.post('/users', validateEmailUniqueness, async (req, res) => { ... });

module.exports = { validateEmailUniqueness };
