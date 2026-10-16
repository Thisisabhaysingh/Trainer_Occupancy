const service = require("./branch.service");

const list = async (_req, res) => res.json(await service.listBranches());
const create = async (req, res) => res.status(201).json(await service.createBranch(req.body));
const stats = async (_req, res) => res.json(await service.getBranchStats());
const listDepartments = async (_req, res) => res.json(await service.listLegacyDepartments());
const createDepartment = async (req, res) => res.status(201).json(await service.createLegacyDepartment(req.body));

module.exports = { list, create, stats, listDepartments, createDepartment };
