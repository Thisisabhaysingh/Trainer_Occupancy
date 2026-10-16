export const rolePermissions = Object.freeze({
  employee: ['employee.view_self', 'department.view', 'branch.view', 'project.view', 'activity.view', 'activity.log_self', 'reportcard.view', 'inventory.view', 'inventory.request'],
  teamlead: ['employee.view_self', 'department.view', 'branch.view', 'project.view', 'activity.view', 'activity.log_self', 'activity.manage', 'reportcard.view', 'inventory.view', 'inventory.request', 'inventory.approve'],
  manager: ['employee.view_self', 'employee.manage', 'department.view', 'branch.view', 'project.view', 'project.manage', 'activity.view', 'activity.manage', 'reportcard.view', 'inventory.view', 'inventory.request', 'inventory.approve'],
  senior_manager: ['employee.view_self', 'department.view', 'branch.view', 'activity.view', 'activity.log_self', 'project.view', 'project.manage', 'reportcard.view', 'inventory.view', 'inventory.request'],
  inventory_admin: ['employee.view_self', 'department.view', 'branch.view', 'inventory.view', 'inventory.request', 'inventory.approve', 'inventory.manage_stock', 'inventory.manage_orders', 'inventory.manage_vendors', 'inventory.receive_orders', 'inventory.allocate', 'inventory.inspect_returns', 'inventory.configure'],
  admin: ['*'],
});

export const hasPermission = (user, permission) => {
  const permissions = Array.isArray(user?.permissions) ? user.permissions : rolePermissions[user?.role] || [];
  return permissions.includes('*') || permissions.includes(permission);
};
