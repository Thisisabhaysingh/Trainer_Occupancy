const express = require('express');
const router = express.Router();
const { Workday } = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');
const { Op } = require('sequelize');

const INVALID_DATE_ERROR = 'INVALID_DATE_FORMAT';

const parseDateInput = (value) => {
  if (!value) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  if (value instanceof Date) {
    const cloned = new Date(value);
    if (Number.isNaN(cloned.getTime())) throw new Error(INVALID_DATE_ERROR);
    cloned.setHours(0, 0, 0, 0);
    return cloned;
  }

  if (typeof value === 'string') {
    const parts = value.split('-');
    if (parts.length !== 3) throw new Error(INVALID_DATE_ERROR);
    const [yearStr, monthStr, dayStr] = parts;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || !month || !day) throw new Error(INVALID_DATE_ERROR);
    const parsed = new Date(year, month - 1, day);
    parsed.setHours(0, 0, 0, 0);
    if (Number.isNaN(parsed.getTime())) throw new Error(INVALID_DATE_ERROR);
    return parsed;
  }

  throw new Error(INVALID_DATE_ERROR);
};

const toDateOnlyString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// Get attendance status for a specific date
router.get('/status', auth, checkRole(['employee', 'manager', 'teamlead', 'senior_manager']), async (req, res) => {
  try {
    let targetDate;
    try {
      targetDate = parseDateInput(req.query.date);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid date value', code: INVALID_DATE_ERROR });
    }

    const dateString = toDateOnlyString(targetDate);
    const workday = await Workday.findOne({ where: { userId: req.user.employeeCode, date: dateString } });

    res.json({
      attendanceType: workday ? workday.attendanceType : null,
      standardHours: workday ? workday.standardHours : null,
      clockedIn: !!(workday && workday.clockIn && !workday.clockOut),
      clockInTime: workday ? workday.clockIn : null,
      clockOutTime: workday ? workday.clockOut : null,
      date: dateString,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark attendance (Full Day / Half Day / Leave)
router.post('/mark-attendance', auth, checkRole(['employee', 'manager', 'teamlead', 'senior_manager']), async (req, res) => {
  try {
    const { attendanceType, date } = req.body; // 'full_day', 'half_day', 'leave'

    if (!['full_day', 'half_day', 'leave'].includes(attendanceType)) {
      return res.status(400).json({ error: 'Invalid attendance type' });
    }

    let targetDate;
    try {
      targetDate = parseDateInput(date);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid date value', code: INVALID_DATE_ERROR });
    }

    const dateString = toDateOnlyString(targetDate);

    // Calculate standard hours based on attendance type
    let standardHours = 0;
    if (attendanceType === 'full_day') standardHours = 9;
    else if (attendanceType === 'half_day') standardHours = 4.5;

    let workday = await Workday.findOne({ where: { userId: req.user.employeeCode, date: dateString } });

    const now = new Date();
    const clockInTime = attendanceType === 'leave'
      ? null
      : (() => {
          const time = new Date(targetDate);
          // If marking for today, preserve current time for accuracy
          if (isSameDay(targetDate, now)) {
            time.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
          }
          return time;
        })();

    if (!workday) {
      workday = await Workday.create({
        userId: req.user.employeeCode,
        date: dateString,
        attendanceType,
        standardHours,
        clockIn: clockInTime,
        clockOut: null,
      });
    } else {
      workday.attendanceType = attendanceType;
      workday.standardHours = standardHours;
      if (attendanceType === 'leave') {
        workday.clockIn = null;
        workday.clockOut = null;
      } else if (!workday.clockIn) {
        workday.clockIn = clockInTime;
      }
      await workday.save();
    }

    res.json({
      message: `Attendance marked as ${attendanceType.replace('_', ' ')}`,
      attendanceType: workday.attendanceType,
      standardHours: workday.standardHours,
      date: dateString,
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clock in
router.post('/clock-in', auth, checkRole(['employee']), async (req, res) => {
  try {
    let targetDate;
    try {
      targetDate = parseDateInput(req.body.date);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid date value', code: INVALID_DATE_ERROR });
    }

    const now = new Date();
    const clockInTime = new Date(targetDate);
    if (isSameDay(targetDate, now)) {
      clockInTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    const dateString = toDateOnlyString(targetDate);
    let workday = await Workday.findOne({ where: { userId: req.user.employeeCode, date: dateString } });
    if (workday && workday.clockIn) {
      return res.status(400).json({ error: 'Already clocked in for this date.' });
    }
    if (!workday) {
      workday = await Workday.create({
        userId: req.user.employeeCode,
        date: dateString,
        clockIn: clockInTime,
        clockOut: null,
      });
    } else {
      workday.clockIn = clockInTime;
      workday.clockOut = null;
      await workday.save();
    }
    res.json({ message: 'Clocked in', clockInTime: workday.clockIn });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Clock out
router.post('/clock-out', auth, checkRole(['employee']), async (req, res) => {
  try {
    let targetDate;
    try {
      targetDate = parseDateInput(req.body.date);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid date value', code: INVALID_DATE_ERROR });
    }

    const dateString = toDateOnlyString(targetDate);
    const workday = await Workday.findOne({ where: { userId: req.user.employeeCode, date: dateString } });
    if (!workday || !workday.clockIn) {
      return res.status(400).json({ error: 'Not clocked in yet.' });
    }
    if (workday.clockOut) {
      return res.status(400).json({ error: 'Already clocked out for this date.' });
    }
    const now = new Date();
    const clockOutTime = new Date(targetDate);
    if (isSameDay(targetDate, now)) {
      clockOutTime.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }
    workday.clockOut = clockOutTime;
    await workday.save();
    res.json({ message: 'Clocked out', clockOutTime: workday.clockOut });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Manual clock in/out entry
router.post('/manual-entry', auth, checkRole(['employee']), async (req, res) => {
  try {
    const { clockIn, clockOut, date } = req.body;
    if (!clockIn && !clockOut) {
      return res.status(400).json({ error: 'At least one of clockIn or clockOut time is required.' });
    }
    let targetDate;
    try {
      targetDate = parseDateInput(date);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid date value', code: INVALID_DATE_ERROR });
    }

    const dateString = toDateOnlyString(targetDate);
    let workday = await Workday.findOne({ where: { userId: req.user.employeeCode, date: dateString } });
    if (!workday) {
      workday = await Workday.create({ userId: req.user.employeeCode, date: dateString });
    }
    if (clockIn) {
      const [inHour, inMin] = clockIn.split(':').map(Number);
      const clockInDate = new Date(targetDate);
      clockInDate.setHours(inHour, inMin, 0, 0);
      workday.clockIn = clockInDate;
    }
    if (clockOut) {
      if (!workday.clockIn) {
        return res.status(400).json({ error: 'You must clock in before clocking out.' });
      }
      const [outHour, outMin] = clockOut.split(':').map(Number);
      const clockOutDate = new Date(targetDate);
      clockOutDate.setHours(outHour, outMin, 0, 0);
      workday.clockOut = clockOutDate;
    }
    await workday.save();
    res.json({ message: 'Manual workday times saved', clockIn: workday.clockIn, clockOut: workday.clockOut });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get attendance history for a date range (for calendar)
router.get('/history', auth, checkRole(['employee', 'teamlead', 'manager']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    let start, end;
    try {
      start = parseDateInput(startDate);
      end = parseDateInput(endDate);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid date range', code: INVALID_DATE_ERROR });
    }

    const workdays = await Workday.findAll({
      where: {
        userId: req.user.employeeCode,
        date: {
          [Op.between]: [toDateOnlyString(start), toDateOnlyString(end)]
        }
      },
      order: [['date', 'ASC']]
    });

    const history = workdays.map(workday => ({
      date: workday.date,
      attendanceType: workday.attendanceType,
      clockedIn: !!(workday.clockIn && !workday.clockOut),
      clockIn: workday.clockIn,
      clockOut: workday.clockOut,
      standardHours: workday.standardHours,
      hours: workday.hours
    }));

    res.json(history);
  } catch (error) {
    console.error('Error fetching workday history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
