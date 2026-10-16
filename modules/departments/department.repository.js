const { Department, User, Activity, sequelize } = require("../../models");

const findAll = () => Department.findAll({ order: [["name", "ASC"]] });
const findById = (id, options = {}) => Department.findByPk(id, options);
const findByName = (name) => Department.findOne({ where: { name } });
const create = (values) => Department.create(values);
const countAssignedEmployees = (departmentId, options = {}) => User.count({ where: { departmentId }, ...options });
const findEmployees = (departmentId) => User.findAll({ where: { departmentId, role: "employee" } });
const findActivities = (departmentId) => Activity.findAll({
  where: { departmentId },
  include: [{ model: User, as: "assignedTo", attributes: ["employeeCode", "name", "email"] }],
});
const deleteActivities = (departmentId, transaction) => Activity.destroy({ where: { departmentId }, transaction });
const withTransaction = (work) => sequelize.transaction(work);

module.exports = {
  findAll, findById, findByName, create, countAssignedEmployees,
  findEmployees, findActivities, deleteActivities, withTransaction,
};
