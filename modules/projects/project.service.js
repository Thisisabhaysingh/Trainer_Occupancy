const repository = require("./project.repository");
const listProjects = (options) => repository.findAll(options);
const getProject = (id, options) => repository.findById(id, options);
module.exports = { listProjects, getProject };
