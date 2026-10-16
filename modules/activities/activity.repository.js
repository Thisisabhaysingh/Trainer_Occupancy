const { Activity } = require("../../models");
const findAll = (options = {}) => Activity.findAll(options);
const findById = (id, options = {}) => Activity.findByPk(id, options);
module.exports = { findAll, findById };
