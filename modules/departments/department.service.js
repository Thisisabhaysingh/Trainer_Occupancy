const AppError = require("../../utils/AppError");
const repository = require("./department.repository");

const listDepartments = () => repository.findAll();

const createDepartment = async (input) => {
  if (await repository.findByName(input.name)) {
    throw new AppError("Department already exists", { statusCode: 400, code: "DEPARTMENT_EXISTS" });
  }
  return repository.create(input);
};

const getDepartmentDetails = async (departmentId) => {
  const department = await repository.findById(departmentId);
  if (!department) throw new AppError("Department not found", { statusCode: 404, code: "DEPARTMENT_NOT_FOUND" });

  const [employees, activities] = await Promise.all([
    repository.findEmployees(departmentId),
    repository.findActivities(departmentId),
  ]);
  const completedActivities = activities.filter((activity) => activity.status === "completed").length;
  const activityMinutes = (activity) => activity.timeEntries?.reduce((sum, entry) => sum + Number(entry.duration || 0), 0) || 0;
  const totalMinutes = activities.reduce((sum, activity) => sum + activityMinutes(activity), 0);
  const totalHours = totalMinutes / 60;
  const activityEmployeeMap = new Map();

  activities.forEach((activity) => {
    if (!activity.title) return;
    if (!activityEmployeeMap.has(activity.title)) activityEmployeeMap.set(activity.title, new Set());
    if (activity.assignedTo?.employeeCode) activityEmployeeMap.get(activity.title).add(activity.assignedTo.employeeCode);
  });
  const topActivity = [...activityEmployeeMap.entries()].reduce(
    (top, [title, employeeSet]) => employeeSet.size > top.count ? { title, count: employeeSet.size } : top,
    { title: "N/A", count: 0 },
  ).title;

  return {
    department: {
      name: department.name,
      code: department.code,
      description: department.description,
      color: department.color,
      location: department.location,
      totalEmployees: employees.length,
      totalActivities: activities.length,
      completedActivities,
      totalHours: Number(totalHours.toFixed(1)),
      avgHours: employees.length ? (totalHours / employees.length).toFixed(1) : "N/A",
      completionRate: activities.length ? Math.round((completedActivities / activities.length) * 100) : 0,
      topActivity,
    },
    employees: employees.map((employee) => {
      const employeeActivities = activities.filter((activity) => activity.assignedTo?.employeeCode === employee.employeeCode);
      return {
        employeeCode: employee.employeeCode,
        name: employee.name,
        email: employee.email,
        totalHours: (employeeActivities.reduce((sum, activity) => sum + activityMinutes(activity), 0) / 60).toFixed(1),
        activities: employeeActivities.map((activity) => ({
          title: activity.title,
          description: activity.description,
          totalMinutes: activityMinutes(activity),
          timeEntries: activity.timeEntries,
          status: activity.status,
          comment: activity.comment,
        })),
      };
    }),
  };
};

const updateDepartment = async (departmentId, input) => {
  const department = await repository.findById(departmentId);
  if (!department) throw new AppError("Department not found", { statusCode: 404, code: "DEPARTMENT_NOT_FOUND" });
  if (input.name && input.name !== department.name && await repository.findByName(input.name)) {
    throw new AppError("Department name already exists", { statusCode: 400, code: "DEPARTMENT_EXISTS" });
  }
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && key !== "code") department[key] = value;
  });
  await department.save();
  return department;
};

const deleteDepartment = async (departmentId) => {
  const department = await repository.findById(departmentId);
  if (!department) throw new AppError("Department not found", { statusCode: 404, code: "DEPARTMENT_NOT_FOUND" });
  const employeeCount = await repository.countAssignedEmployees(departmentId);
  if (employeeCount > 0) {
    throw new AppError(`Cannot delete department. ${employeeCount} employee(s) are assigned to this department.`, {
      statusCode: 400,
      code: "DEPARTMENT_IN_USE",
    });
  }
  await repository.withTransaction(async (transaction) => {
    await repository.deleteActivities(departmentId, transaction);
    await department.destroy({ transaction });
  });
};

module.exports = { listDepartments, createDepartment, getDepartmentDetails, updateDepartment, deleteDepartment };
