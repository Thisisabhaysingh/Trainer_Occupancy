// routes/holiday.js
const express = require('express');
const router = express.Router();
const { Holiday, User } = require('../models');
const { auth, checkRole } = require('../middleware/auth');
const { Op } = require('sequelize');

// ==================== Get all holidays ====================
router.get('/', async (req, res) => {
  try {
    const holidays = await Holiday.findAll({
      order: [['date', 'ASC']],
    });
    res.json(holidays);
  } catch (err) {
    console.error("Error fetching holidays:", err);
    res.status(500).json({ error: 'Failed to fetch holidays' });
  }
});

// ==================== Add a new holiday (admin only) ====================
router.post('/', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    // Check for duplicate holiday on same date
    const existingHoliday = await Holiday.findOne({ where: { date } });
    if (existingHoliday) {
      return res.status(400).json({ error: 'Holiday already exists for this date' });
    }

    const holiday = await Holiday.create({
      date,
      reason,
      createdById: req.user?.employeeCode
    });

    res.status(201).json(holiday);
  } catch (err) {
    console.error("Error creating holiday:", err);
    res.status(500).json({ error: 'Failed to create holiday', details: err.message });
  }
});

// ==================== Delete a holiday (admin only) ====================
router.delete('/:id', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Holiday.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Holiday not found' });

    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting holiday:", err);
    res.status(500).json({ error: 'Failed to delete holiday' });
  }
});

module.exports = router;
