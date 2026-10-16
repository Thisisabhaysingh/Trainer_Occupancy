const assert = require('node:assert/strict');
const modelsId = require.resolve('../models');
let employeeWhere;
let employeeAvailable = true;
let project = { id: 1, departmentId: 7, branchId: 3, project_manager: 'OTHER', get() { return { ...this }; } };
let activity = { project_id: 1 };
let template = { createdById: 'EMP-7' };
require.cache[modelsId] = { id: modelsId, loaded: true, exports: {
  User: { findOne: async ({ where }) => { employeeWhere = where; return employeeAvailable ? { employeeCode: where.employeeCode } : null; }, findAll: async () => [{ employeeCode: 'EMP-7' }] },
  PMProject: { findByPk: async () => project },
  Activity: { findByPk: async () => activity },
  PMDeadlineExtension: { findByPk: async () => ({ entity_type: 'task', entity_id: 1 }) },
  Template: { findByPk: async () => template },
} };
const { seniorProjectScope, seniorTrainerScope, seniorTemplateScope } = require('../middleware/seniorManagementScope');
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const user = { role: 'senior_manager', employeeCode: 'SM-1', managerType: 'department', departmentId: 7, branchId: 3 };
async function check(handler, req, expected) {
  const res = response();
  let passed = false;
  await handler(req, res, () => { passed = true; });
  assert.equal(expected === 200 ? passed : res.statusCode, expected === 200 ? true : expected);
}
async function run() {
  const request = { user, params: { id: 1 }, route: { path: '/:id' }, method: 'GET', body: {}, query: {} };
  await check(seniorProjectScope, { ...request, route: { path: '/' }, params: {}, method: 'POST', body: { departmentId: 8 } }, 403);
  await check(seniorProjectScope, request, 200);
  project.departmentId = 8;
  for (const route of ['/:id', '/:id/jobs', '/:id/members', '/:id/clone', '/activities/:id', '/extensions/:id/approve']) {
    request.route.path = route;
    await check(seniorProjectScope, request, 404);
  }
  project.departmentId = 7;
  request.route.path = '/:id'; request.method = 'PUT'; request.body = { departmentId: 8 };
  await check(seniorProjectScope, request, 403);
  request.method = 'GET'; request.body = {}; user.managerType = 'branch';
  await check(seniorProjectScope, request, 200);
  project.branchId = 4;
  await check(seniorProjectScope, request, 404);
  project.project_manager = 'SM-1';
  await check(seniorProjectScope, request, 200);
  user.managerType = 'department';
  request.query.employeeId = 'EMP-7';
  await check(seniorTrainerScope, request, 200);
  assert.deepEqual(employeeWhere, { employeeCode: 'EMP-7', departmentId: 7 });
  employeeAvailable = false;
  await check(seniorTrainerScope, request, 404);
  user.managerType = 'branch';
  await check(seniorTrainerScope, request, 404);
  assert.equal(employeeWhere.branchId, 3);
  await check(seniorTemplateScope, request, 200);
  template.createdById = 'EMP-OTHER';
  await check(seniorTemplateScope, request, 404);
  user.branchId = null;
  for (const guard of [seniorProjectScope, seniorTrainerScope, seniorTemplateScope]) await check(guard, request, 403);
  user.role = 'manager';
  for (const guard of [seniorProjectScope, seniorTrainerScope, seniorTemplateScope]) await check(guard, request, 200);
  console.log('Senior management scope checks passed: department/branch isolation, project ownership, activity/extension scope, trainer/template scope, missing assignment denied, Manager behavior preserved.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
