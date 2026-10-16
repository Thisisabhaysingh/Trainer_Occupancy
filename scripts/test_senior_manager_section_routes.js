const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const mock = (path, exports) => { const id = require.resolve(path); require.cache[id] = { id, loaded: true, exports }; };
let employeeWhere;
let templateWhere;
let toolWhere;
mock('../models', {
  User: { findByPk: async () => ({ departmentId: 7 }), findOne: async () => null, findAll: async ({ where }) => { employeeWhere = where; return []; } },
  ToolAssignment: { findOne: async ({ where }) => { toolWhere = where; return { workbook: true, reportCard: false }; } },
  Template: { findAll: async ({ where }) => { templateWhere = where; return []; } },
  Activity: { findAll: async () => [] },
});
mock('../middleware/auth', { auth: (req, res, next) => next(), checkRole: roles => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Denied' }) });
mock('../services/emailService', { notifyProjectEvent: async () => {}, sendWelcomeEmail: async () => {}, sendProfileUpdateEmail: async () => {} });
mock('../services/notificationService', { createInAppNotification: async () => {} });
const scopes = require('../middleware/seniorManagementScope');
const projectRouter = require('../modules/projects/projects.routes');
const trainerRouter = require('../modules/trainer-occupancy/trainer-occupancy.routes');
const templateRouter = require('../modules/templates/templates.routes');
const employeeRouter = require('../modules/employees/employees.routes');
const toolsRouter = require('../modules/tool-assignments/tool-assignments.routes');
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
async function run() {
  for (const [router, scope] of [[projectRouter, scopes.seniorProjectScope], [trainerRouter, scopes.seniorTrainerScope], [templateRouter, scopes.seniorTemplateScope]]) {
    for (const layer of router.stack.filter(item => item.route)) assert.ok(layer.route.stack.some(item => item.handle === scope), `${layer.route.path} includes scope middleware`);
  }
  const user = { role: 'senior_manager', employeeCode: 'SM-1', managerType: 'department', departmentId: 7, branchId: 3 };
  for (const [router, path, method] of [[projectRouter, '/', 'post'], [projectRouter, '/:id/jobs', 'post'], [projectRouter, '/:id/clone', 'post'], [trainerRouter, '/', 'post'], [templateRouter, '/', 'post']]) {
    const route = router.stack.find(item => item.route?.path === path && item.route.methods[method]).route;
    const guard = route.stack[2].handle;
    let passed = false;
    guard({ user }, response(), () => { passed = true; });
    assert.ok(passed, `Senior Manager editing allowed for ${path}`);
  }
  const deleteProject = projectRouter.stack.find(item => item.route?.path === '/:id' && item.route.methods.delete).route;
  const denied = response();
  deleteProject.stack[2].handle({ user }, denied, () => assert.fail('Admin-only project deletion expanded'));
  assert.equal(denied.statusCode, 403);
  const listTemplates = templateRouter.stack.find(item => item.route?.path === '/' && item.route.methods.get).route;
  await listTemplates.stack.at(-1).handle({ user, templateCreatorIds: ['SM-1', 'EMP-7'] }, response());
  assert.deepEqual(templateWhere.createdById[Op.in], ['SM-1', 'EMP-7']);
  const listEmployees = employeeRouter.stack.find(item => item.route?.path === '/' && item.route.methods.get).route;
  let passed = false;
  listEmployees.stack[1].handle({ user }, response(), () => { passed = true; });
  assert.ok(passed);
  for (const managerType of ['department', 'branch']) {
    user.managerType = managerType;
    const res = response();
    await listEmployees.stack.at(-1).handle({ user }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(employeeWhere[managerType === 'branch' ? 'branchId' : 'departmentId'], managerType === 'branch' ? 3 : 7);
  }
  const toolList = toolsRouter.stack.find(item => item.route?.path === '/me').route;
  const toolResponse = response();
  await toolList.stack.at(-1).handle({ user }, toolResponse);
  assert.deepEqual(toolWhere, { departmentId: 7, role: 'manager' }, 'Senior Manager inherits configured Manager tool visibility');
  assert.equal(toolResponse.body.reportCard, false, 'disabled tools stay disabled');
  const { hasPermission } = require('../auth/permissions');
  for (const permission of ['project.view', 'project.manage', 'reportcard.view', 'inventory.view', 'inventory.request']) assert.ok(hasPermission('senior_manager', permission));
  for (const permission of ['employee.manage', 'inventory.approve', 'inventory.manage_orders', 'inventory.configure']) assert.equal(hasPermission('senior_manager', permission), false);
  assert.equal(require('../modules/sso/sso.constants').REPORTCARD_ROLE_BY_MIS_ROLE.senior_manager, 'manager');
  console.log('Shared section route checks passed: scope guards wired on every project/trainer/template route, approved editing roles, scoped assignment lists, Admin-only project deletion preserved.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
