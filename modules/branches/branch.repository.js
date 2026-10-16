const { Branch, Department, User, Activity } = require("../../models");

const findAll = () => Branch.findAll({
  include: [
    { model: User, as: "manager", attributes: ["employeeCode", "name", "email"] },
    { model: User, as: "branchUsers", attributes: ["employeeCode", "name", "email"] },
  ],
  order: [["name", "ASC"]],
});
const findByName = (name) => Branch.findOne({ where: { name } });
const create = (values) => Branch.create(values);
const findAllForStats = () => Branch.findAll({
  include: [{
    model: User,
    as: "branchUsers",
    include: [{ model: Activity, as: "activities", attributes: ["id", "status", "timeEntries"] }],
  }],
});
const findDepartments = () => Department.findAll({ order: [["name", "ASC"]] });
const createDepartment = (values) => Department.create(values);

module.exports = { findAll, findByName, create, findAllForStats, findDepartments, createDepartment };
