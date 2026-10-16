// Actual route tests with in-memory data. No database connections or writes.
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const rows = [
  { id: 1, title: 'Team work', departmentId: 7 },
  { id: 2, title: 'Total No. of Sessions', departmentId: 7 },
  { id: 3, title: 'School Session', departmentId: 7 },
  { id: 4, title: 'Branch work', departmentId: 8 },
  { id: 5, title: 'Team work', departmentId: 8 },
  { id: 6, title: 'Total No. of Sessions', departmentId: 8 },
  { id: 7, title: 'Outside branch', departmentId: 9 },
];
function matches(row, where) {
  return Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object') {
      return (!value[Op.in] || value[Op.in].includes(row[key])) &&
        (value[Op.eq] === undefined || row[key] === value[Op.eq]) &&
        (value[Op.ne] === undefined || row[key] !== value[Op.ne]);
    }
    return String(value) === String(row[key]);
  });
}
let saved;
let emptyBranch = false;
const models = {
  ActivityTemplate: {
    findAll: async ({ where }) => rows.filter(row => matches(row, where)),
    findOne: async ({ where }) => rows.find(row => matches(row, where)) || null,
  },
  Department: { findAll: async ({ where }) => {
    assert.equal(where.branchId, 3);
    return emptyBranch ? [] : [{ id: 7 }, { id: 8 }];
  } },
  Activity: { create: async values => (saved = { id: 101, ...values }), findByPk: async () => saved },
};
function mock(path, exports) {
  const id = require.resolve(path); require.cache[id] = { id, filename: id, loaded: true, exports };
}
mock('../models', models);
mock('../middleware/auth', {
  auth: (req, res, next) => next(),
  checkRole: roles => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Access denied' }),
});
const router = require('../modules/activities/activities.routes');
async function call(method, path, user, body = {}, params = {}) {
  const routes = router.stack.filter(layer => layer.route?.path === path && layer.route.methods[method]);
  assert.equal(routes.length, 1);
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  const req = { user, body, params, query: { departmentId: 9, branchId: 999 } };
  for (const layer of routes[0].route.stack) {
    let proceed = false; await layer.handle(req, res, () => { proceed = true; });
    if (!proceed) break;
  }
  return res;
}
const user = role => ({ role, departmentId: 7, branchId: 3, employeeCode: 'SELF', managerType: 'department' });
async function run() {
  const expected = [1, 2, 3];
  for (const role of ['employee', 'teamlead', 'manager']) {
    for (const managerType of ['department', 'branch']) {
      const who = { ...user(role), managerType };
      const list = await call('get', '/department', who);
      assert.equal(list.statusCode, 200);
      assert.deepEqual(list.body.map(row => row.id), expected, role + ' retains Employee department rules');
      if (role === 'manager') {
        const managerList = await call('get', '/templates', who);
        assert.deepEqual(managerList.body.map(row => row.id), expected, 'Manager management list equals Employee list');
      }
    }
  }
  let who = user('senior_manager');
  let res = await call('get', '/templates', who);
  assert.deepEqual(res.body.map(row => row.id), expected, 'Senior Manager inherits former department Manager view including system sessions');
  who.managerType = 'branch';
  res = await call('get', '/templates', who);
  assert.deepEqual(res.body.map(row => row.id), [1, 3, 4, 5], 'Senior Manager inherits former branch Manager view and session exclusion');
  assert.equal((await call('get', '/templates', { ...who, branchId: null })).statusCode, 400);
  assert.equal((await call('get', '/templates', { ...who, managerType: 'department', departmentId: null })).statusCode, 400);
  emptyBranch = true;
  assert.deepEqual((await call('get', '/templates', who)).body, []);
  emptyBranch = false;
  assert.deepEqual((await call('get', '/department', { ...user('employee'), departmentId: null })).body, []);
  for (const role of ['employee', 'teamlead', 'inventory_admin']) {
    assert.equal((await call('get', '/templates', user(role))).statusCode, 403);
  }
  const body = { title: 'Branch work', templateId: 4, description: 'Work', department: 7, startTime: '09:00', endTime: '10:00', timeEntries: [{ duration: 60 }] };
  res = await call('post', '/', who, body);
  assert.equal(res.statusCode, 201, 'Senior Manager can log a template visible through branch scope');
  assert.equal(res.body.departmentId, 7, 'activity remains in own department');
  assert.equal((await call('post', '/', who, { ...body, title: 'Outside branch', templateId: 7 })).statusCode, 400);
  assert.equal((await call('post', '/', who, { ...body, assignedToId: 'OTHER' })).statusCode, 403);
  assert.equal((await call('post', '/', who, { ...body, department: 9 })).statusCode, 403);
  // Duplicate titles are validated with the selected ID and server scope.
  assert.equal((await call('post', '/', who, { ...body, title: 'Team work', templateId: 5 })).statusCode, 201);
  assert.equal((await call('post', '/', who, { ...body, title: 'Team work', templateId: 7 })).statusCode, 400);
  const sessions = { ...body, title: 'Total No. of Sessions', templateId: 2, institute: 1, school: 2, sessionType: 'Offline' };
  assert.equal((await call('post', '/', user('senior_manager'), sessions)).statusCode, 201);
  assert.equal((await call('post', '/', who, sessions)).statusCode, 400);
  const { employeeActivityTemplates } = await import('../client/src/utils/activityTemplates.mjs');
  const input = [{ id: 10, title: 'z work' }, { id: 11, title: 'School Session' }, { id: 12, title: 'a work' }];
  const normalized = employeeActivityTemplates(input);
  assert.deepEqual(input.map(row => row.id), [10, 11, 12], 'normalization does not mutate caller data');
  assert.equal(normalized.filter(row => row.title === 'School Session').length, 1);
  assert(normalized.some(row => row.title === 'Institute Session'));
  assert.deepEqual(normalized.slice(0, 3).map(row => row.id), [12, 11, 10]);
  console.log('Template visibility checks passed: all four roles, branch/department boundaries, session rules, duplicate titles, logging and shared Employee dropdown defaults.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
