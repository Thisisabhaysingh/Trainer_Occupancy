const express = require('express');
const router = express.Router();
const { Notification } = require('../models');
const { auth } = require('../middleware/auth');
const { Op } = require('sequelize');

router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.employeeCode },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    const unread = await Notification.findAll({
      where: {
        userId: req.user.employeeCode,
        isRead: false,
      },
      attributes: ['type'],
    });

    res.json({
      success: true,
      notifications,
      unread: {
        messages: unread.filter(item => item.type === 'message').length,
        notifications: unread.filter(item => item.type === 'notification').length,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: {
        id: req.params.id,
        userId: req.user.employeeCode,
      },
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    await notification.update({ isRead: true, readAt: new Date() });
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/read-all/:type?', auth, async (req, res) => {
  try {
    const where = {
      userId: req.user.employeeCode,
      isRead: false,
    };

    if (req.params.type && ['message', 'notification'].includes(req.params.type)) {
      where.type = req.params.type;
    }

    await Notification.update(
      { isRead: true, readAt: new Date() },
      { where }
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notifications read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/old-read', auth, async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    await Notification.destroy({
      where: {
        userId: req.user.employeeCode,
        isRead: true,
        updatedAt: { [Op.lt]: cutoff },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
