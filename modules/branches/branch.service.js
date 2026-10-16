const AppError = require("../../utils/AppError");
const repository = require("./branch.repository");

const listBranches = () => repository.findAll();
const createBranch = async (input) => {
  if (await repository.findByName(input.name)) throw new AppError("Branch already exists", { statusCode: 400, code: "BRANCH_EXISTS" });
  return repository.create(input);
};
const getBranchStats = async () => (await repository.findAllForStats()).map((branch) => {
  const employees = branch.branchUsers || [];
  const totalActivities = employees.reduce((total, employee) => total + (employee.activities || []).length, 0);
  const completedActivities = employees.reduce((total, employee) => total + (employee.activities || []).filter((activity) => activity.status === "completed").length, 0);
  return {
    id: branch.id,
    name: branch.name,
    location: branch.location,
    totalEmployees: employees.length,
    totalActivities,
    completionRate: totalActivities ? Math.round((completedActivities / totalActivities) * 100) : 0,
  };
});

module.exports = {
  listBranches,
  createBranch,
  getBranchStats,
  listLegacyDepartments: repository.findDepartments,
  createLegacyDepartment: repository.createDepartment,
};
