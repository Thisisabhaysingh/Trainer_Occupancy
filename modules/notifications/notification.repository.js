const { Op } = require("sequelize");
const { Notification } = require("../../models");

const findForUser = (userId, limit = 50) => Notification.findAll({ where: { userId }, order: [["createdAt", "DESC"]], limit });
const findUnreadTypes = (userId) => Notification.findAll({ where: { userId, isRead: false }, attributes: ["type"] });
const findOwnedById = (id, userId) => Notification.findOne({ where: { id, userId } });
const markAllRead = (userId, type) => Notification.update({ isRead: true, readAt: new Date() }, { where: { userId, isRead: false, ...(type ? { type } : {}) } });
const deleteOldRead = (userId, cutoff) => Notification.destroy({ where: { userId, isRead: true, updatedAt: { [Op.lt]: cutoff } } });
module.exports = { findForUser, findUnreadTypes, findOwnedById, markAllRead, deleteOldRead };
