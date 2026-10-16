const service = require("./department.service");

const list = async (_req, res) => res.json(await service.listDepartments());
const create = async (req, res) => res.status(201).json(await service.createDepartment(req.body));
const details = async (req, res) => res.json(await service.getDepartmentDetails(req.params.departmentId));
const update = async (req, res) => res.json(await service.updateDepartment(req.params.departmentId, req.body));
const remove = async (req, res) => {
  await service.deleteDepartment(req.params.departmentId);
  return res.json({ message: "Department deleted successfully" });
};

module.exports = { list, create, details, update, remove };
