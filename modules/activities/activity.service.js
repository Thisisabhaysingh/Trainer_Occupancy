const repository = require("./activity.repository");
const listActivities = (options) => repository.findAll(options);
const getActivity = (id, options) => repository.findById(id, options);
module.exports = { listActivities, getActivity };
