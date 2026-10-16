const { Project } = require("../../models");
const findAll = (options = {}) => Project.findAll(options);
const findById = (id, options = {}) => Project.findByPk(id, options);
module.exports = { findAll, findById };
