const makeResult = (data, issues) => issues.length ? { success: false, error: { issues } } : { success: true, data };
const cleanOptional = (value) => value === undefined ? undefined : String(value || "").trim();

const departmentSchema = (partial = false) => ({
  safeParse(input) {
    const data = {
      name: cleanOptional(input?.name),
      code: cleanOptional(input?.code),
      description: cleanOptional(input?.description),
      location: cleanOptional(input?.location),
      color: cleanOptional(input?.color),
    };
    const issues = [];
    if (!partial && !data.name) issues.push({ path: ["name"], message: "Name is required" });
    if (!partial && !data.location) issues.push({ path: ["location"], message: "Location is required" });
    if (partial && !Object.values(data).some((value) => value !== undefined)) issues.push({ path: [], message: "At least one field is required" });
    return makeResult(data, issues);
  },
});

const departmentIdSchema = {
  safeParse(input) {
    const departmentId = Number(input?.departmentId);
    const issues = Number.isInteger(departmentId) && departmentId > 0 ? [] : [{ path: ["departmentId"], message: "A valid department ID is required" }];
    return makeResult({ departmentId }, issues);
  },
};

module.exports = { createDepartmentSchema: departmentSchema(false), updateDepartmentSchema: departmentSchema(true), departmentIdSchema };
