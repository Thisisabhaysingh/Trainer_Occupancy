const service = require("./notification.service");
const list = async (req, res) => res.json({ success: true, ...(await service.listForUser(req.user.employeeCode)) });
const markRead = async (req, res) => res.json({ success: true, notification: await service.markRead(req.params.id, req.user.employeeCode) });
const markAllRead = async (req, res) => { await service.markAllRead(req.user.employeeCode, req.params.type); return res.json({ success: true }); };
const clearOldRead = async (req, res) => { await service.clearOldRead(req.user.employeeCode); return res.json({ success: true }); };
module.exports = { list, markRead, markAllRead, clearOldRead };
