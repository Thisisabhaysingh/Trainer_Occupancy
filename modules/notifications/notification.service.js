const AppError = require("../../utils/AppError");
const repository = require("./notification.repository");

const listForUser = async (userId) => {
  const [notifications, unread] = await Promise.all([repository.findForUser(userId), repository.findUnreadTypes(userId)]);
  return { notifications, unread: { messages: unread.filter((item) => item.type === "message").length, notifications: unread.filter((item) => item.type === "notification").length } };
};
const markRead = async (id, userId) => {
  const notification = await repository.findOwnedById(id, userId);
  if (!notification) throw new AppError("Notification not found", { statusCode: 404, code: "NOTIFICATION_NOT_FOUND" });
  await notification.update({ isRead: true, readAt: new Date() });
  return notification;
};
const markAllRead = (userId, type) => repository.markAllRead(userId, ["message", "notification"].includes(type) ? type : undefined);
const clearOldRead = (userId) => repository.deleteOldRead(userId, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
module.exports = { listForUser, markRead, markAllRead, clearOldRead };
