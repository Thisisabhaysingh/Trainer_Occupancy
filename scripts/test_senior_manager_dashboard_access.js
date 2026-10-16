// Exercise the actual route guards and report scope without a database connection.
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const mockModule = (path, exports) => {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports };
};
let employeeWhere;
let availableEmployee = true;
const User = {
  findOne: async ({ where }) => {
    employeeWhere = where;
    return availableEmployee ? { employeeCode: 'EMP-1' } : null;
  },
};
mockModule('../models/User', User);
mockModule('../models', {
  User,
  Activity: { findAll: async ({ where }) => {
    assert.equal(where.assignedToId, 'EMP-1');
    return [{ id: 1, title: 'Planning', timeEntries: [
      { date: '2026-10-05T12:00:00Z', duration: 60 },
      { date: '2026-09-01T12:00:00Z', duration: 60 },
    ] }];
  } },
});
mockModule('../services/emailService', { sendWelcomeEmail: async () => {} });
const router = require('../modules/management/management.routes');
const route = path => router.stack.find(layer => layer.route?.path === path).route;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

async function run() {
  for (const path of ['/analytics', '/employee/:employeeId/activities-by-date', '/employee/:employeeId/analytics']) {
    const guard = route(path).stack[1].handle;
    for (const role of ['senior_manager', 'manager']) {
      let allowed = false;
      guard({ user: { role } }, response(), () => { allowed = true; });
      assert.equal(allowed, true, `${role} can read ${path}`);
    }
    for (const role of ['employee', 'inventory_admin', ...(path.endsWith('/:employeeId/analytics') ? [] : ['teamlead'])]) {
      const res = response();
      guard({ user: { role } }, res, () => assert.fail(`${role} unexpectedly allowed`));
      assert.equal(res.statusCode, 403);
    }
  }
  const handler = route('/employee/:employeeId/activities-by-date').stack.at(-1).handle;
  const request = {
    user: { role: 'senior_manager', managerType: 'department', departmentId: 7, branchId: 3 },
    params: { employeeId: 'EMP-1' }, query: { startDate: '2026-10-05', endDate: '2026-10-05' },
  };
  let res = response();
  await handler(request, res);
  assert.equal(employeeWhere.departmentId, 7);
  assert.equal(employeeWhere.branchId, undefined);
  assert.equal(employeeWhere.employeeCode, 'EMP-1');
  assert.deepEqual(employeeWhere.role[Op.in], ['employee', 'manager', 'teamlead']);
  assert.equal(res.body[0].timeEntries.length, 1, 'report excludes entries outside date range');

  request.user.managerType = 'branch';
  res = response();
  await handler(request, res);
  assert.equal(employeeWhere.branchId, 3);
  assert.equal(employeeWhere.departmentId, undefined);

  availableEmployee = false;
  res = response();
  await handler(request, res);
  assert.equal(res.statusCode, 404, 'out-of-scope employee is unavailable');

  const detailHandler = route('/employee/:employeeId/analytics').stack.at(-1).handle;
  for (const scope of ['department', 'branch']) {
    request.user.managerType = scope;
    res = response();
    await detailHandler(request, res);
    assert.equal(res.statusCode, 404, 'employee details reject an out-of-scope user');
    assert.equal(employeeWhere[scope === 'branch' ? 'branchId' : 'departmentId'], scope === 'branch' ? 3 : 7);
  }

  const createEmployeeGuard = route('/employees').stack[1].handle;
  res = response();
  createEmployeeGuard({ user: { role: 'senior_manager' } }, res, () => assert.fail('Senior Manager gained employee creation access'));
  assert.equal(res.statusCode, 403);
  console.log('Senior Manager dashboard access checks passed (read roles, department/branch scope, date filtering, denied writes).');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
