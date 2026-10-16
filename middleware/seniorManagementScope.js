const { User, PMProject, Activity, PMDeadlineExtension, Template } = require('../models');

const scopeWhere = user => {
  const key = user.managerType === 'branch' ? 'branchId' : 'departmentId';
  return user[key] ? { [key]: user[key] } : null;
};
const same = (left, right) => left != null && right != null && String(left) === String(right);
const canAccessProject = (user, project) => {
  if (!project) return false;
  if (same(project.project_manager, user.employeeCode)) return true;
  const scope = scopeWhere(user);
  return scope && Object.entries(scope).every(([key, value]) => same(project[key], value));
};

const seniorProjectScope = async (req, res, next) => {
  if (req.user.role !== 'senior_manager') return next();
  const scope = scopeWhere(req.user);
  if (!scope) return res.status(403).json({ error: 'No management scope assigned' });
  if (req.method === 'POST' && (req.route.path === '/' || req.route.path === '/:id/clone')) {
    for (const [key, value] of Object.entries(scope)) {
      if (req.body?.[key] != null && !same(req.body[key], value)) return res.status(403).json({ error: 'Projects must be created in your management scope' });
    }
  }
  if (req.route.path.startsWith('/employee/')) return next(); // These handlers enforce self-assignment.
  let projectId = req.params.projectId || req.params.id;
  try {
    if (req.route.path.startsWith('/activities/')) {
      const activity = await Activity.findByPk(req.params.id);
      projectId = activity?.project_id;
      if (!projectId) return res.status(404).json({ error: 'Project activity not found' });
    } else if (req.route.path.startsWith('/extensions/')) {
      const extension = await PMDeadlineExtension.findByPk(req.params.id);
      if (!extension) return res.status(404).json({ error: 'Extension not found' });
      if (extension.entity_type === 'project') projectId = extension.entity_id;
      else projectId = (await Activity.findByPk(extension.entity_id))?.project_id;
      if (!projectId) return res.status(404).json({ error: 'Project not found' });
    }
    if (!projectId) return next();
    const project = await PMProject.findByPk(projectId);
    if (!canAccessProject(req.user, project)) return res.status(404).json({ error: 'Project not found in your management scope' });
    if (req.method === 'PUT' && req.route.path === '/:id' && !canAccessProject(req.user, { ...project.get({ plain: true }), ...req.body })) {
      return res.status(403).json({ error: 'Project must remain in your management scope' });
    }
    return next();
  } catch (error) { return res.status(500).json({ error: 'Could not validate project access' }); }
};

const seniorTrainerScope = async (req, res, next) => {
  if (req.user.role !== 'senior_manager') return next();
  const scope = scopeWhere(req.user);
  if (!scope) return res.status(403).json({ error: 'No management scope assigned' });
  const employeeCode = req.body?.employeeId || req.query?.employeeId;
  if (!employeeCode) return next();
  try {
    const employee = await User.findOne({ where: { employeeCode, ...scope }, attributes: ['employeeCode'] });
    if (!employee) return res.status(404).json({ error: 'Trainer not found in your management scope' });
    return next();
  } catch (error) { return res.status(500).json({ error: 'Could not validate trainer access' }); }
};

const seniorTemplateScope = async (req, res, next) => {
  if (req.user.role !== 'senior_manager') return next();
  const scope = scopeWhere(req.user);
  if (!scope) return res.status(403).json({ error: 'No management scope assigned' });
  try {
    const users = await User.findAll({ where: scope, attributes: ['employeeCode'] });
    req.templateCreatorIds = [...new Set([req.user.employeeCode, ...users.map(user => user.employeeCode)])];
    if (req.params.id) {
      const template = await Template.findByPk(req.params.id);
      if (!template || !req.templateCreatorIds.some(id => same(id, template.createdById))) return res.status(404).json({ error: 'Template not found in your management scope' });
    }
    return next();
  } catch (error) { return res.status(500).json({ error: 'Could not validate template access' }); }
};

module.exports = { seniorProjectScope, seniorTrainerScope, seniorTemplateScope, scopeWhere, canAccessProject };
