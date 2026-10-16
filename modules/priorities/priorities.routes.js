const express = require('express');
const router = express.Router();
const { PmPriorityDefinition, PmStatusDefinition } = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');
const { Op } = require('sequelize');

// ==================== PRIORITY ENDPOINTS ====================

// Get all priorities (accessible to all authenticated users)
router.get('/priorities', auth, async (req, res) => {
    try {
        const priorities = await PmPriorityDefinition.findAll({
            where: { is_active: true },
            order: [['sort_order', 'ASC'], ['level', 'DESC']]
        });
        res.json({ success: true, priorities });
    } catch (error) {
        console.error('Error fetching priorities:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single priority
router.get('/priorities/:id', auth, async (req, res) => {
    try {
        const priority = await PmPriorityDefinition.findByPk(req.params.id);
        if (!priority) {
            return res.status(404).json({ error: 'Priority not found' });
        }
        res.json({ success: true, priority });
    } catch (error) {
        console.error('Error fetching priority:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create priority (admin only)
router.post('/priorities', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { name, color, level, applies_to, sort_order } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const existing = await PmPriorityDefinition.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ error: 'Priority name already exists' });
        }
        
        const priority = await PmPriorityDefinition.create({
            name,
            color: color || '#007bff',
            level: level || 0,
            applies_to: applies_to || 'all',
            sort_order: sort_order || 0,
            is_active: true
        });
        
        res.status(201).json({ success: true, priority });
    } catch (error) {
        console.error('Error creating priority:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update priority (admin only)
router.put('/priorities/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const priority = await PmPriorityDefinition.findByPk(req.params.id);
        if (!priority) {
            return res.status(404).json({ error: 'Priority not found' });
        }
        
        await priority.update(req.body);
        res.json({ success: true, priority });
    } catch (error) {
        console.error('Error updating priority:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete priority (admin only)
router.delete('/priorities/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const priority = await PmPriorityDefinition.findByPk(req.params.id);
        if (!priority) {
            return res.status(404).json({ error: 'Priority not found' });
        }
        
        // Soft delete - just deactivate
        await priority.update({ is_active: false });
        res.json({ success: true, message: 'Priority deactivated' });
    } catch (error) {
        console.error('Error deleting priority:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== STATUS ENDPOINTS ====================

// Get all statuses (accessible to all authenticated users)
router.get('/statuses', auth, async (req, res) => {
    try {
        const statuses = await PmStatusDefinition.findAll({
            where: { is_active: true },
            order: [['sort_order', 'ASC']]
        });
        res.json({ success: true, statuses });
    } catch (error) {
        console.error('Error fetching statuses:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single status
router.get('/statuses/:id', auth, async (req, res) => {
    try {
        const status = await PmStatusDefinition.findByPk(req.params.id);
        if (!status) {
            return res.status(404).json({ error: 'Status not found' });
        }
        res.json({ success: true, status });
    } catch (error) {
        console.error('Error fetching status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create status (admin only)
router.post('/statuses', auth, checkRole(['admin']), async (req, res) => {
    try {
        const { name, color, category, sort_order } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const existing = await PmStatusDefinition.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ error: 'Status name already exists' });
        }
        
        const status = await PmStatusDefinition.create({
            name,
            color: color || '#6c757d',
            category: category || 'not_started',
            sort_order: sort_order || 0,
            is_active: true
        });
        
        res.status(201).json({ success: true, status });
    } catch (error) {
        console.error('Error creating status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update status (admin only)
router.put('/statuses/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const status = await PmStatusDefinition.findByPk(req.params.id);
        if (!status) {
            return res.status(404).json({ error: 'Status not found' });
        }
        
        await status.update(req.body);
        res.json({ success: true, status });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete status (admin only)
router.delete('/statuses/:id', auth, checkRole(['admin']), async (req, res) => {
    try {
        const status = await PmStatusDefinition.findByPk(req.params.id);
        if (!status) {
            return res.status(404).json({ error: 'Status not found' });
        }
        
        await status.update({ is_active: false });
        res.json({ success: true, message: 'Status deactivated' });
    } catch (error) {
        console.error('Error deleting status:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;