const ROLE_PERMISSIONS = Object.freeze({
  employee: ["employee.view_self", "department.view", "branch.view", "project.view", "activity.view", "activity.log_self", "reportcard.view", "inventory.view", "inventory.request"],
  teamlead: ["employee.view_self", "department.view", "branch.view", "project.view", "activity.view", "activity.log_self", "activity.manage", "reportcard.view", "inventory.view", "inventory.request", "inventory.approve"],
  manager: ["employee.view_self", "employee.manage", "department.view", "branch.view", "project.view", "project.manage", "activity.view", "activity.manage", "reportcard.view", "inventory.view", "inventory.request", "inventory.approve"],
  senior_manager: ["employee.view_self", "department.view", "branch.view", "activity.view", "activity.log_self", "project.view", "project.manage", "reportcard.view", "inventory.view", "inventory.request"],
  inventory_admin: ["employee.view_self", "department.view", "branch.view", "inventory.view", "inventory.request", "inventory.approve", "inventory.manage_stock", "inventory.manage_orders", "inventory.manage_vendors", "inventory.receive_orders", "inventory.allocate", "inventory.inspect_returns", "inventory.configure"],
  admin: ["*"],
});

const getPermissionsForRole = (role) => ROLE_PERMISSIONS[role] || [];
const hasPermission = (role, permission) => {
  const permissions = getPermissionsForRole(role);
  return permissions.includes("*") || permissions.includes(permission);
};

module.exports = { ROLE_PERMISSIONS, getPermissionsForRole, hasPermission };
