const parse = (input, { partial = false } = {}) => {
  const data = {
    name: input?.name === undefined ? undefined : String(input.name || "").trim(),
    location: input?.location === undefined ? undefined : String(input.location || "").trim(),
    managerId: input?.managerId === undefined || input.managerId === "" ? null : String(input.managerId).trim(),
  };
  const issues = [];
  if (!partial && !data.name) issues.push({ path: ["name"], message: "Name is required" });
  if (!partial && !data.location) issues.push({ path: ["location"], message: "Location is required" });
  return issues.length ? { success: false, error: { issues } } : { success: true, data };
};

const createBranchSchema = { safeParse: (input) => parse(input) };
const legacyDepartmentSchema = {
  safeParse(input) {
    const name = String(input?.name || "").trim();
    return name ? { success: true, data: { name, description: String(input?.description || "").trim() } } : { success: false, error: { issues: [{ path: ["name"], message: "Name is required" }] } };
  },
};
module.exports = { createBranchSchema, legacyDepartmentSchema };
