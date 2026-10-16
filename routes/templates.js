const express = require('express');
const router = express.Router();
const { Template } = require('../models');
const { auth, checkRole } = require('../middleware/auth');

router.get('/', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const templates = await Template.findAll({ order: [['createdAt', 'DESC']] });
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.get('/:id', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.post('/', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const { name, description, category, difficulty, jobs } = req.body;
    if (!name) return res.status(400).json({ error: 'Template name is required' });

    const template = await Template.create({
      name,
      description,
      category,
      difficulty: difficulty || 'Medium',
      jobs: jobs || [],
      createdById: req.user.employeeCode,
      updatedById: req.user.employeeCode,
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.put('/:id', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });

    const { name, description, category, difficulty, jobs } = req.body;
    await template.update({
      name: name || template.name,
      description: description || template.description,
      category: category || template.category,
      difficulty: difficulty || template.difficulty,
      jobs: jobs || template.jobs,
      updatedById: req.user.employeeCode,
    });

    res.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

router.delete('/:id', auth, checkRole(['admin', 'manager']), async (req, res) => {
  try {
    const template = await Template.findByPk(req.params.id);
    if (!template) return res.status(404).json({ error: 'Template not found' });
    await template.destroy();
    res.json({ message: 'Template deleted' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

module.exports = router;
