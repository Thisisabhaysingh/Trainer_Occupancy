const { Notification } = require('../models');
const { Op } = require('sequelize');

const MAX_NOTIFICATIONS_PER_USER = 50;

const pruneUserNotifications = async (userId) => {
  if (!userId) return;

  const notifications = await Notification.findAll({
    where: { userId },
    attributes: ['id'],
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    raw: true,
  });

  const overflowIds = notifications
    .slice(MAX_NOTIFICATIONS_PER_USER)
    .map(notification => notification.id);
  if (overflowIds.length === 0) return;

  await Notification.destroy({
    where: {
      userId,
      id: { [Op.in]: overflowIds },
    },
  });
};

const eventCopy = {
  project: {
    title: 'New project assigned',
    entityType: 'project',
  },
  job: {
    title: 'New job assigned',
    entityType: 'job',
  },
  task: {
    title: 'New task assigned',
    entityType: 'task',
  },
  member: {
    title: 'Added to project',
    entityType: 'project_member',
  },
  review_submitted: {
    title: 'Task submitted for review',
    entityType: 'task',
  },
  review_approved: {
    title: 'Task approved',
    entityType: 'task',
  },
  review_redo: {
    title: 'Task redo requested',
    entityType: 'task',
  },
};

const createInAppNotification = async ({ user, eventType, project, item, roleLabel }) => {
  if (!user?.employeeCode) return null;

  const copy = eventCopy[eventType] || { title: 'Project update', entityType: eventType || 'project' };
  const itemText = item?.title ? `${item.title} - ` : '';
  const projectText = project?.name || 'Project';

  const notification = await Notification.create({
    userId: user.employeeCode,
    type: ['job', 'task', 'review_submitted', 'review_approved', 'review_redo'].includes(eventType) ? 'message' : 'notification',
    title: copy.title,
    body: `${itemText}${projectText}${roleLabel ? ` (${roleLabel})` : ''}`,
    entityType: copy.entityType,
    entityId: item?.id || project?.id || null,
    metadata: {
      projectId: project?.id || null,
      projectName: project?.name || null,
      itemTitle: item?.title || null,
      role: roleLabel || null,
    },
  });

  await pruneUserNotifications(user.employeeCode);

  return notification;
};

module.exports = {
  createInAppNotification,
  pruneUserNotifications,
};
