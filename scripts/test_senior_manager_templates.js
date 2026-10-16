// Exercise actual template routes with an in-memory repository, never production records.
const assert = require('node:assert/strict');
const { Op } = require('sequelize');
const matches = (row, where) => Object.entries(where).every(([key, value]) => {
  if (value && typeof value === 'object') {
    return (!value[Op.in] || value[Op.in].includes(row[key])) &&
      (value[Op.eq] === undefined || row[key] === value[Op.eq]) &&
      (value[Op.ne] === undefined || row[key] !== value[Op.ne]);
  }
  return String(row[key]) === String(value);
});
const modelsId = require.resolve('../models');
let rows = [];
let nextId = 10;
let lastWhere;
let savedActivity;
const Activity = { create: async values => (savedActivity = { id: 100, ...values }), findByPk: async () => savedActivity };
const ActivityTemplate = {
  create: async values => {
    const row = { id: nextId++, ...values, save: async () => {}, destroy: async () => { rows = rows.filter(item => item !== row); } };
    rows.push(row);
    return row;
  },
  findAll: async ({ where }) => rows.filter(row => matches(row, where)),
  findOne: async ({ where }) => {
    lastWhere = where;
    return rows.find(row => matches(row, where)) || null;
  },
};
require.cache[modelsId] = { id: modelsId, filename: modelsId, loaded: true, exports: { Activity, ActivityTemplate, Department: { findAll: async () => [{ id: 7 }, { id: 8 }] } } };
const authId = require.resolve('../middleware/auth');
require.cache[authId] = { id: authId, filename: authId, loaded: true, exports: {
  auth: (req, res, next) => next(),
  checkRole: roles => (req, res, next) => roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Access denied.' }),
} };
const router = require('../modules/activities/activities.routes');
const getRoute = (method, path) => router.stack.filter(layer => layer.route?.path === path && layer.route.methods[method]);
const response = () => ({ statusCode: 200, status(value) { this.statusCode = value; return this; }, json(body) { this.body = body; return this; } });
async function call(method, path, req) {
  const routes = getRoute(method, path);
  assert.equal(routes.length, 1, 'only one handler is registered for each template action');
  const res = response();
  for (const layer of routes[0].route.stack) {
    let next = false;
    await layer.handle(req, res, () => { next = true; });
    if (!next) break;
  }
  return res;
}
async function run() {
  const user = { employeeCode: 'SM-1', role: 'senior_manager', departmentId: 7 };
  const request = (body = {}, id = 10) => ({ user, body, params: { id } });
  for (const role of ['employee', 'teamlead', 'inventory_admin']) {
    for (const [method, path] of [['post', '/templates'], ['put', '/templates/:id'], ['delete', '/templates/:id']]) {
      const res = await call(method, path, { ...request({ title: 'Planning' }), user: { ...user, role } });
      assert.equal(res.statusCode, 403);
    }
  }
  for (const role of ['senior_manager', 'manager']) {
    user.role = role;
    let res = await call('post', '/templates', request({ title: ' Planning ', departmentId: 999, createdById: 'OTHER' }));
    assert.equal(res.statusCode, 201);
    const id = res.body.template.id;
    assert.equal(res.body.template.departmentId, 7, 'request cannot override department');
    assert.equal(res.body.template.createdById, 'SM-1', 'request cannot override creator');
    assert.equal(res.body.template.title, 'Planning');
    res = await call('put', '/templates/:id', request({ title: 'Updated' }, id));
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.template.title, 'Updated');
    user.departmentId = 8;
    for (const method of ['put', 'delete']) {
      res = await call(method, '/templates/:id', request({ title: 'Unauthorized' }, id));
      assert.equal(res.statusCode, 404);
      assert.equal(lastWhere.departmentId, 8);
    }
    user.departmentId = 7;
    res = await call('delete', '/templates/:id', request({}, id));
    assert.equal(res.statusCode, 200);
    assert.equal(rows.length, 0);
  }
  user.role = 'senior_manager';
  for (const title of ['', '  ', 42, 'x'.repeat(256), 'Total No. of Sessions']) {
    assert.equal((await call('post', '/templates', request({ title }))).statusCode, 400);
  }
  const protectedRow = await ActivityTemplate.create({ title: 'Total No. of Sessions', departmentId: 7 });
  for (const method of ['put', 'delete']) assert.equal((await call(method, '/templates/:id', request({ title: 'Changed' }, protectedRow.id))).statusCode, 400);
  const ordinaryRow = await ActivityTemplate.create({ title: 'Ordinary', departmentId: 7, audience: 'senior_manager' });
  assert.equal((await call('put', '/templates/:id', request({ title: 'Total No. of Sessions' }, ordinaryRow.id))).statusCode, 400);
  user.departmentId = null;
  for (const [method, path] of [['post', '/templates'], ['put', '/templates/:id'], ['delete', '/templates/:id']]) assert.equal((await call(method, path, request({ title: 'Planning' }))).statusCode, 400);
  console.log('Template CRUD checks passed: Manager and Senior Manager writes, department isolation, input validation and protected session templates.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
