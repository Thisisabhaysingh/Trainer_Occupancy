const express = require('express');
const router = express.Router();
const { sequelize, PMProject, PMProjectMember, PMDeadlineExtension, PMCloneLog, Activity, User, Department, Branch, PmPriorityDefinition, PmStatusDefinition } = require('../../models');
const { auth, checkRole } = require('../../middleware/auth');
const { seniorProjectScope } = require('../../middleware/seniorManagementScope');
const { Op } = require('sequelize');
const { notifyProjectEvent } = require('../../services/emailService');
const { createInAppNotification } = require('../../services/notificationService');

const ALL_EMPLOYEES_ASSIGNEE = '__ALL_EMPLOYEES__';
const BULK_EMAIL_BATCH_SIZE = Number(process.env.BULK_EMAIL_BATCH_SIZE || 20);
const BULK_EMAIL_BATCH_DELAY_MS = Number(process.env.BULK_EMAIL_BATCH_DELAY_MS || 2000);

// Helper function to get priority value (customizable fallback)
const getPriorityValue = async (project) => {
    if (project.priority_id) {
        const priority = await PmPriorityDefinition.findByPk(project.priority_id);
        if (priority) return priority;
    }
    return { name: project.priority || 'medium', color: '#ff9800', level: 3 };
};

// Helper function to get status value (customizable fallback)
const getStatusValue = async (project) => {
    if (project.status_id) {
        const status = await PmStatusDefinition.findByPk(project.status_id);
        if (status) return status;
    }
    const statusMap = {
        'planning': { name: 'Planning', color: '#17a2b8', category: 'not_started' },
        'active': { name: 'In Progress', color: '#007bff', category: 'in_progress' },
        'on_hold': { name: 'On Hold', color: '#ffc107', category: 'on_hold' },
        'completed': { name: 'Completed', color: '#28a745', category: 'completed' },
        'cancelled': { name: 'Cancelled', color: '#dc3545', category: 'cancelled' }
    };
    return statusMap[project.status] || { name: project.status, color: '#6c757d', category: 'other' };
};

const ensureProjectMember = async (projectId, employeeCode, transaction) => {
    if (!employeeCode) return;
    
    const existingMember = await PMProjectMember.findOne({
        where: { project_id: projectId, user_id: employeeCode },
        transaction
    });
    
    if (!existingMember) {
        await PMProjectMember.create({
            project_id: projectId,
            user_id: employeeCode,
            role: 'member'
        }, { transaction });
        console.log(`Auto-added ${employeeCode} as member of project ${projectId}`);
    }
};

const isWorkItemComplete = (activity) =>
    activity?.status === 'completed' || Number(activity?.completion_percentage_new || 0) >= 100;

const getOwnProgress = (activity) => {
    if (!activity) return 0;
    if (isWorkItemComplete(activity)) return 100;
    const progress = Number(activity.completion_percentage_new || 0);
    return Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
};

const calculateRollupProgress = (activities = []) => {
    const plainActivities = activities.map(activity =>
        typeof activity.toJSON === 'function' ? activity.toJSON() : activity
    );
    const subtasksByTaskId = new Map();
    const tasksByJobId = new Map();
    const jobs = [];
    const topLevelTasks = [];

    plainActivities.forEach((activity) => {
        if (activity.hierarchy_level === 'subtask' && activity.parent_activity_id) {
            if (!subtasksByTaskId.has(activity.parent_activity_id)) subtasksByTaskId.set(activity.parent_activity_id, []);
            subtasksByTaskId.get(activity.parent_activity_id).push(activity);
        } else if (activity.hierarchy_level === 'task') {
            const parentJobId = activity.job_id || activity.parent_activity_id || null;
            if (parentJobId) {
                if (!tasksByJobId.has(parentJobId)) tasksByJobId.set(parentJobId, []);
                tasksByJobId.get(parentJobId).push(activity);
            } else {
                topLevelTasks.push(activity);
            }
        } else if (activity.hierarchy_level === 'job') {
            jobs.push(activity);
        }
    });

    const getTaskProgress = (task) => {
        const subtasks = subtasksByTaskId.get(task.id) || [];
        if (subtasks.length === 0) return getOwnProgress(task);
        const subtaskTotal = subtasks.reduce((sum, subtask) => sum + getOwnProgress(subtask), 0);
        return subtaskTotal / subtasks.length;
    };

    const getJobProgress = (job) => {
        const tasks = tasksByJobId.get(job.id) || [];
        if (tasks.length === 0) return getOwnProgress(job);
        const taskTotal = tasks.reduce((sum, task) => sum + getTaskProgress(task), 0);
        return taskTotal / tasks.length;
    };

    const jobProgressList = jobs.map(job => getJobProgress(job));
    const topLevelTaskProgressList = topLevelTasks.map(task => getTaskProgress(task));
    const projectUnits = jobProgressList.length > 0 ? jobProgressList : topLevelTaskProgressList;
    const progress = projectUnits.length > 0
        ? Number((projectUnits.reduce((sum, value) => sum + value, 0) / projectUnits.length).toFixed(2))
        : 0;

    return {
        progress,
        completedTasksCount: plainActivities.filter(activity =>
            activity.hierarchy_level === 'task' && getTaskProgress(activity) >= 100
        ).length,
        completedJobsCount: jobs.filter(job => getJobProgress(job) >= 100).length
    };
};

const recalculateProjectHierarchy = async (projectId, transaction = null) => {
    if (!projectId) return;
    const activities = await Activity.findAll({
        where: { project_id: projectId, hierarchy_level: { [Op.in]: ['job', 'task', 'subtask'] } },
        transaction
    });
    const byJob = new Map();
    const byTask = new Map();
    const jobs = [];
    const topTasks = [];
    const own = (a) => (['completed', 'approved'].includes(a.status) || Number(a.completion_percentage_new || 0) >= 100)
        ? 100
        : Math.max(0, Math.min(100, Number(a.completion_percentage_new || 0) || 0));

    activities.forEach((a) => {
        if (a.hierarchy_level === 'job') jobs.push(a);
        if (a.hierarchy_level === 'task') {
            const jobId = a.job_id || a.parent_activity_id || null;
            if (jobId) {
                if (!byJob.has(jobId)) byJob.set(jobId, []);
                byJob.get(jobId).push(a);
            } else topTasks.push(a);
        }
        if (a.hierarchy_level === 'subtask' && a.parent_activity_id) {
            if (!byTask.has(a.parent_activity_id)) byTask.set(a.parent_activity_id, []);
            byTask.get(a.parent_activity_id).push(a);
        }
    });

    const taskProgress = new Map();
    for (const task of activities.filter(a => a.hierarchy_level === 'task')) {
        const subs = byTask.get(task.id) || [];
        const progress = subs.length ? subs.reduce((s, a) => s + own(a), 0) / subs.length : own(task);
        taskProgress.set(task.id, progress);
        await task.update({
            completion_percentage_new: Number(progress.toFixed(2)),
            status: progress >= 100 ? 'completed' : (task.status === 'completed' ? 'in-progress' : task.status)
        }, { transaction });
    }

    const jobProgress = [];
    for (const job of jobs) {
        const tasks = byJob.get(job.id) || [];
        const progress = tasks.length ? tasks.reduce((s, t) => s + (taskProgress.get(t.id) ?? own(t)), 0) / tasks.length : own(job);
        jobProgress.push(progress);
        await job.update({
            completion_percentage_new: Number(progress.toFixed(2)),
            status: progress >= 100 ? 'completed' : (job.status === 'completed' ? 'in-progress' : job.status)
        }, { transaction });
    }

    const units = jobProgress.length ? jobProgress : topTasks.map(t => taskProgress.get(t.id) ?? own(t));
    const projectProgress = units.length ? Number((units.reduce((s, v) => s + v, 0) / units.length).toFixed(2)) : 0;
    const project = await PMProject.findByPk(projectId, { transaction });
    if (project) {
        await project.update({
            progress: projectProgress,
            status: projectProgress >= 100 ? 'completed' : (project.status === 'completed' ? 'active' : project.status)
        }, { transaction });
    }
};

const getProjectStats = async (projectId) => {
    const [jobsCount, tasksCount, projectMembers, activityAssignees, rollupActivities] = await Promise.all([
        Activity.count({ where: { project_id: projectId, hierarchy_level: 'job' } }),
        Activity.count({ where: { project_id: projectId, hierarchy_level: 'task' } }),
        PMProjectMember.findAll({ where: { project_id: projectId }, attributes: ['user_id'] }),
        Activity.findAll({
            where: {
                project_id: projectId,
                hierarchy_level: { [Op.in]: ['job', 'task', 'subtask'] },
                assignedToId: { [Op.ne]: null }
            },
            attributes: ['assignedToId'],
            group: ['assignedToId']
        }),
        Activity.findAll({
            where: {
                project_id: projectId,
                hierarchy_level: { [Op.in]: ['job', 'task', 'subtask'] }
            },
            attributes: ['id', 'hierarchy_level', 'parent_activity_id', 'job_id', 'status', 'completion_percentage_new']
        })
    ]);

    const rollup = calculateRollupProgress(rollupActivities);
    const memberIds = new Set([
        ...projectMembers.map(member => member.user_id),
        ...activityAssignees.map(activity => activity.assignedToId)
    ].filter(Boolean));

    return {
        jobs_count: jobsCount,
        tasks_count: tasksCount,
        members_count: memberIds.size,
        completed_tasks_count: rollup.completedTasksCount,
        completed_jobs_count: rollup.completedJobsCount,
        progress: rollup.progress
    };
};

const getProjectMembers = async (projectId) => {
    const projectMembers = await PMProjectMember.findAll({
        where: { project_id: projectId },
        include: [{ model: User, as: 'memberUser', attributes: ['employeeCode', 'name', 'email', 'role'] }]
    });

    const memberMap = new Map();
    projectMembers.forEach(member => {
        if (member.memberUser) {
            memberMap.set(member.user_id, {
                ...member.memberUser.toJSON(),
                projectRole: member.role,
                joined_at: member.joined_at
            });
        }
    });

    const activityAssignees = await Activity.findAll({
        where: {
            project_id: projectId,
            hierarchy_level: { [Op.in]: ['job', 'task', 'subtask'] },
            assignedToId: { [Op.ne]: null }
        },
        attributes: ['assignedToId'],
        group: ['assignedToId']
    });

    const missingIds = activityAssignees
        .map(activity => activity.assignedToId)
        .filter(employeeCode => employeeCode && !memberMap.has(employeeCode));

    if (missingIds.length > 0) {
        const users = await User.findAll({
            where: { employeeCode: { [Op.in]: missingIds } },
            attributes: ['employeeCode', 'name', 'email', 'role']
        });

        users.forEach(user => {
            memberMap.set(user.employeeCode, {
                ...user.toJSON(),
                projectRole: 'assignee'
            });
        });
    }

    return Array.from(memberMap.values());
};

const notifyProjectUsers = async (notifications, options = {}) => {
    const results = { sent: 0, skipped: 0, failed: 0 };
    const emailBatchSize = Math.max(1, Number(options.emailBatchSize || notifications?.length || 1));
    const emailBatchDelayMs = Math.max(0, Number(options.emailBatchDelayMs || 0));
    const notificationList = notifications || [];

    for (let index = 0; index < notificationList.length; index += emailBatchSize) {
        const batch = notificationList.slice(index, index + emailBatchSize);

        for (const notification of batch) {
            try {
                await createInAppNotification(notification);
            } catch (error) {
                console.warn('Project in-app notification failed:', error.message);
            }

            try {
                const emailResult = await notifyProjectEvent(notification);
                if (emailResult?.skipped) {
                    results.skipped += 1;
                } else {
                    results.sent += 1;
                }
            } catch (error) {
                results.failed += 1;
                console.warn('Project email notification failed:', error.message);
            }
        }

        if (emailBatchDelayMs > 0 && index + emailBatchSize < notificationList.length) {
            await new Promise(resolve => setTimeout(resolve, emailBatchDelayMs));
        }
    }
    return results;
};

// ==================== EMPLOYEE-SPECIFIC ENDPOINTS (MUST BE FIRST!) ====================

// GET /api/employee/my-projects - Get all projects assigned to logged-in employee
router.get('/employee/my-projects', auth, seniorProjectScope, async (req, res) => {
    try {
        const employeeCode = req.user.employeeCode;
        console.log(`Fetching projects for employee: ${employeeCode}`);
        
        const myActivities = await Activity.findAll({
            where: {
                assignedToId: employeeCode,
                hierarchy_level: { [Op.in]: ['task', 'job', 'subtask'] },
                project_id: { [Op.ne]: null }
            },
            attributes: ['project_id'],
            group: ['project_id']
        });
        
        const projectIds = myActivities.map(a => a.project_id);
        
        if (projectIds.length === 0) {
            return res.json({ success: true, projects: [] });
        }
        
        const projects = await PMProject.findAll({
            where: { id: { [Op.in]: projectIds } },
            include: [
                { model: User, as: 'projectManager', attributes: ['employeeCode', 'name'] },
                { model: User, as: 'projectCreator', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDefinition', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDefinition', attributes: ['id', 'name', 'color', 'category'] }
            ]
        });
        
        const projectsWithStats = await Promise.all(projects.map(async (project) => {
            const myTasksCount = await Activity.count({
                where: {
                    project_id: project.id,
                    assignedToId: employeeCode,
                    hierarchy_level: { [Op.in]: ['task', 'subtask'] }
                }
            });
            
            const completedTasksCount = await Activity.count({
                where: {
                    project_id: project.id,
                    assignedToId: employeeCode,
                    hierarchy_level: { [Op.in]: ['task', 'subtask'] },
                    status: 'completed'
                }
            });
            
            const activities = await Activity.findAll({
                where: {
                    project_id: project.id,
                    assignedToId: employeeCode,
                    hierarchy_level: { [Op.in]: ['task', 'subtask'] }
                },
                attributes: ['estimated_hours_new', 'actual_hours_new', 'createdById']
            });
            
            const totalEstimated = activities.reduce((sum, a) => sum + (parseFloat(a.estimated_hours_new) || 0), 0);
            const totalActual = activities.reduce((sum, a) => sum + (parseFloat(a.actual_hours_new) || 0), 0);
            
            const member = await PMProjectMember.findOne({
                where: { project_id: project.id, user_id: employeeCode }
            });
            
            const firstActivity = activities[0];
            let assignedBy = null;
            let assignedVia = 'project_membership';
            
            if (firstActivity) {
                const creator = await User.findByPk(firstActivity.createdById, { attributes: ['name'] });
                assignedBy = creator?.name || null;
                assignedVia = 'task_assignment';
            }
            
            return {
                ...project.toJSON(),
                userRole: member?.role || 'member',
                my_tasks_count: myTasksCount,
                completed_tasks_count: completedTasksCount,
                total_estimated_hours: totalEstimated,
                total_actual_hours: totalActual,
                assigned_by: assignedBy,
                assigned_via: assignedVia
            };
        }));
        
        console.log(`Returning ${projectsWithStats.length} projects for employee ${employeeCode}`);
        res.json({ success: true, projects: projectsWithStats });
    } catch (error) {
        console.error('Error fetching my projects:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/employee/my-projects/:projectId/tasks - Get tasks for a specific project
router.get('/employee/my-projects/:projectId/tasks', auth, seniorProjectScope, async (req, res) => {
    try {
        const employeeCode = req.user.employeeCode;
        const { projectId } = req.params;
        
        console.log(`Fetching tasks for employee ${employeeCode} in project ${projectId}`);
        
        const project = await PMProject.findByPk(projectId, {
            include: [
                { model: User, as: 'projectManager', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDefinition', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDefinition', attributes: ['id', 'name', 'color', 'category'] }
            ]
        });
        
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        const tasks = await Activity.findAll({
            where: {
                project_id: projectId,
                assignedToId: employeeCode,
                hierarchy_level: { [Op.in]: ['task', 'job'] }
            },
            include: [
                { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
            ],
            order: [['order_index', 'ASC'], ['createdAt', 'ASC']]
        });
        
        const member = await PMProjectMember.findOne({
            where: { project_id: projectId, user_id: employeeCode }
        });
        
        console.log(`Found ${tasks.length} tasks for employee ${employeeCode} in project ${project.name}`);
        
        res.json({
            success: true,
            project: {
                ...project.toJSON(),
                userRole: member?.role || 'member'
            },
            tasks: tasks
        });
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/employee/tasks/:taskId/status - Update task status
router.put('/employee/tasks/:taskId/status', auth, seniorProjectScope, async (req, res) => {
    try {
        const employeeCode = req.user.employeeCode;
        const { taskId } = req.params;
        const { status } = req.body;
        
        const task = await Activity.findOne({
            where: {
                id: taskId,
                assignedToId: employeeCode
            }
        });
        
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found or not assigned to you' });
        }
        
        task.status = status;
        await task.save();
        
        if (status === 'completed') {
            task.completion_percentage_new = 100;
            await task.save();
        }
        
        console.log(`Task ${taskId} status updated to ${status} by ${employeeCode}`);
        res.json({ success: true, message: 'Status updated successfully' });
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// PUT /api/employee/tasks/:taskId/note - Add note to task
router.put('/employee/tasks/:taskId/note', auth, seniorProjectScope, async (req, res) => {
    try {
        const employeeCode = req.user.employeeCode;
        const { taskId } = req.params;
        const { note } = req.body;
        
        const task = await Activity.findOne({
            where: {
                id: taskId,
                assignedToId: employeeCode
            }
        });
        
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found or not assigned to you' });
        }
        
        task.comment = note;
        await task.save();
        
        res.json({ success: true, message: 'Note saved successfully' });
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/employee/tasks/:taskId/request-extension - Request deadline extension
router.post('/employee/tasks/:taskId/request-extension', auth, seniorProjectScope, async (req, res) => {
    try {
        const employeeCode = req.user.employeeCode;
        const { taskId } = req.params;
        const { new_deadline, reason } = req.body;
        
        const task = await Activity.findOne({
            where: {
                id: taskId,
                assignedToId: employeeCode
            }
        });
        
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found or not assigned to you' });
        }
        
        const existingExtension = await PMDeadlineExtension.findOne({
            where: {
                entity_type: 'task',
                entity_id: taskId,
                status: 'pending'
            }
        });
        
        if (existingExtension) {
            return res.status(400).json({ success: false, error: 'You already have a pending extension request for this task' });
        }
        
        const extension = await PMDeadlineExtension.create({
            entity_type: 'task',
            entity_id: taskId,
            old_deadline: task.dueDate,
            new_deadline,
            reason,
            requested_by: employeeCode,
            status: 'pending'
        });
        
        console.log(`Extension request created for task ${taskId} by ${employeeCode}`);
        res.json({ success: true, message: 'Extension request submitted successfully', extension });
    } catch (error) {
        console.error('Error requesting extension:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== GET ENDPOINTS ====================

// Get all projects
router.get('/', auth, seniorProjectScope, async (req, res) => {
    try {
        let where = {};
        
        if (req.user.role === 'employee') {
            const memberProjects = await PMProjectMember.findAll({
                where: { user_id: req.user.employeeCode },
                attributes: ['project_id']
            });
            const projectIds = memberProjects.map(m => m.project_id);
            where.id = { [Op.in]: projectIds };
        } else if (['manager', 'senior_manager'].includes(req.user.role)) {
            const scopeFilters = [];
            if (req.user.managerType === 'department' || (req.user.role === 'senior_manager' && !req.user.managerType)) {
                scopeFilters.push({ departmentId: req.user.departmentId });
            } else if (req.user.managerType === 'branch') {
                scopeFilters.push({ branchId: req.user.branchId });
            }
            scopeFilters.push({ project_manager: req.user.employeeCode });
            where = { [Op.or]: scopeFilters };
        }
        
        const projects = await PMProject.findAll({
            where,
            include: [
                { model: Department, as: 'projectDepartment', attributes: ['id', 'name'] },
                { model: Branch, as: 'projectBranch', attributes: ['id', 'name'] },
                { model: User, as: 'projectManager', attributes: ['employeeCode', 'name'] },
                { model: User, as: 'projectCreator', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDefinition', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDefinition', attributes: ['id', 'name', 'color', 'category'] }
            ],
            order: [['created_at', 'DESC']]
        });
        
        const projectsWithStats = await Promise.all(projects.map(async (project) => ({
            ...project.toJSON(),
            ...(await getProjectStats(project.id))
        })));

        res.json({ success: true, projects: projectsWithStats });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single project with full hierarchy
router.get('/:id', auth, seniorProjectScope, async (req, res) => {
    try {
        const projectId = req.params.id;
        console.log('Fetching project details for ID:', projectId);
        
        const project = await PMProject.findByPk(projectId, {
            include: [
                { model: Department, as: 'projectDepartment', attributes: ['id', 'name'] },
                { model: Branch, as: 'projectBranch', attributes: ['id', 'name'] },
                { model: User, as: 'projectManager', attributes: ['employeeCode', 'name'] },
                { model: User, as: 'projectCreator', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDefinition', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDefinition', attributes: ['id', 'name', 'color', 'category'] }
            ]
        });
        
        if (!project) {
            console.log('Project not found:', projectId);
            return res.status(404).json({ error: 'Project not found' });
        }
        
        console.log('Project found:', project.name);
        
        const jobs = await Activity.findAll({
            where: { 
                project_id: project.id, 
                hierarchy_level: 'job' 
            },
            include: [
                { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
            ],
            order: [['order_index', 'ASC'], ['createdAt', 'ASC']]
        });
        
        console.log(`Found ${jobs.length} jobs for project ${project.name}`);
        
        for (const job of jobs) {
            const tasks = await Activity.findAll({
                where: { 
                    parent_activity_id: job.id, 
                    hierarchy_level: 'task' 
                },
                include: [
                    { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name'] },
                    { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                    { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
                ],
                order: [['order_index', 'ASC'], ['createdAt', 'ASC']]
            });

            for (const task of tasks) {
                const subtasks = await Activity.findAll({
                    where: {
                        parent_activity_id: task.id,
                        hierarchy_level: 'subtask'
                    },
                    include: [
                        { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name'] },
                        { model: User, as: 'createdBy', attributes: ['employeeCode', 'name'] },
                        { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                        { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
                    ],
                    order: [['order_index', 'ASC'], ['createdAt', 'ASC']]
                });
                task.dataValues.subtasks = subtasks;
            }

            job.dataValues.tasks = tasks;
            console.log(`  Job "${job.title}" has ${tasks.length} tasks`);
        }
        
        const members = await getProjectMembers(project.id);
        
        const projectActivity = await Activity.findOne({
            where: { project_id: project.id, hierarchy_level: 'project' }
        });
        
        const stats = await getProjectStats(project.id);

        res.json({ 
            success: true, 
            project: {
                ...project.toJSON(),
                ...stats
            },
            projectActivity: projectActivity || null,
            jobs: jobs,
            members
        });
        
    } catch (error) {
        console.error('Error fetching project details:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get project hierarchy tree
router.get('/:id/hierarchy', auth, seniorProjectScope, async (req, res) => {
    try {
        const project = await PMProject.findByPk(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const hierarchy = await Activity.findAll({
            where: { project_id: project.id },
            include: [
                { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name'] },
                { model: Activity, as: 'childActivities' }
            ],
            order: [['order_index', 'ASC']]
        });
        
        const buildTree = (items, parentId = null) => {
            return items
                .filter(item => item.parent_activity_id === parentId)
                .map(item => ({
                    ...item.toJSON(),
                    children: buildTree(items, item.id)
                }));
        };
        
        const tree = buildTree(hierarchy, null);
        
        res.json({ success: true, project, hierarchy: tree });
    } catch (error) {
        console.error('Error fetching hierarchy:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== POST ENDPOINTS ====================

// Create project
router.post('/', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { name, description, departmentId, branchId, start_date, end_date, project_manager, priority_id, status_id, members } = req.body;

        let effectiveDepartmentId = departmentId || null;
        let effectiveBranchId = branchId || null;
        let effectiveProjectManager = project_manager && project_manager !== '' ? project_manager : null;

        if (['manager', 'senior_manager'].includes(req.user.role)) {
            effectiveProjectManager = req.user.employeeCode;

            if (req.user.managerType === 'department') {
                if (effectiveDepartmentId && String(effectiveDepartmentId) !== String(req.user.departmentId)) {
                    await transaction.rollback();
                    return res.status(403).json({ error: 'You can only create projects in your department' });
                }
                effectiveDepartmentId = req.user.departmentId || null;
                effectiveBranchId = effectiveBranchId || req.user.branchId || null;
            } else if (req.user.managerType === 'branch') {
                if (effectiveBranchId && String(effectiveBranchId) !== String(req.user.branchId)) {
                    await transaction.rollback();
                    return res.status(403).json({ error: 'You can only create projects in your branch' });
                }
                effectiveBranchId = req.user.branchId || null;

                if (effectiveDepartmentId) {
                    const selectedDepartment = await Department.findByPk(effectiveDepartmentId, { transaction });
                    if (selectedDepartment?.branchId && String(selectedDepartment.branchId) !== String(req.user.branchId)) {
                        await transaction.rollback();
                        return res.status(403).json({ error: 'Selected department is outside your branch' });
                    }
                }
            } else {
                effectiveDepartmentId = effectiveDepartmentId || req.user.departmentId || null;
                effectiveBranchId = effectiveBranchId || req.user.branchId || null;
            }
        }
        
        const projectData = {
            name,
            description: description || null,
            departmentId: effectiveDepartmentId,
            branchId: effectiveBranchId,
            start_date: start_date || null,
            end_date: end_date || null,
            project_manager: effectiveProjectManager,
            priority_id: priority_id || null,
            status_id: status_id || null,
            priority: 'medium',
            status: 'planning',
            progress: 0,
            created_by: req.user.employeeCode
        };
        
        const project = await PMProject.create(projectData, { transaction });
        
        await Activity.create({
            title: `Project: ${name}`,
            description: description || '',
            project_id: project.id,
            hierarchy_level: 'project',
            assignedToId: effectiveProjectManager || req.user.employeeCode,
            createdById: req.user.employeeCode,
            status: 'accepted',
            start_date: start_date,
            dueDate: end_date,
            completion_percentage_new: 0
        }, { transaction });
        
        await PMProjectMember.create({
            project_id: project.id,
            user_id: req.user.employeeCode,
            role: 'owner'
        }, { transaction });
        
        if (effectiveProjectManager && effectiveProjectManager !== req.user.employeeCode) {
            await PMProjectMember.create({
                project_id: project.id,
                user_id: effectiveProjectManager,
                role: 'manager'
            }, { transaction });
        }
        
        if (members && Array.isArray(members)) {
            for (const member of members) {
                await PMProjectMember.create({
                    project_id: project.id,
                    user_id: member.user_id,
                    role: member.role || 'member'
                }, { transaction });
            }
        }
        
        await transaction.commit();
        
        const completeProject = await PMProject.findByPk(project.id, {
            include: [
                { model: PmPriorityDefinition, as: 'priorityDefinition' },
                { model: PmStatusDefinition, as: 'statusDefinition' }
            ]
        });

        const notifyUserIds = new Map();
        if (effectiveProjectManager) notifyUserIds.set(effectiveProjectManager, 'manager');
        if (members && Array.isArray(members)) {
            members.forEach(member => {
                if (member.user_id) notifyUserIds.set(member.user_id, member.role || 'member');
            });
        }

        if (notifyUserIds.size > 0) {
            const usersToNotify = await User.findAll({
                where: { employeeCode: { [Op.in]: Array.from(notifyUserIds.keys()) } },
                attributes: ['employeeCode', 'name', 'email']
            });

            await notifyProjectUsers(usersToNotify.map(user => ({
                user,
                eventType: 'project',
                project: completeProject,
                roleLabel: notifyUserIds.get(user.employeeCode)
            })));
        }
        
        res.status(201).json({ success: true, project: completeProject });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating project:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create job under project
router.post('/:id/jobs', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const projectId = req.params.id;
        console.log('Creating job for project:', projectId);
        
        const project = await PMProject.findByPk(projectId);
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }
        
        const { title, description, assigned_to, due_date, estimated_hours, priority_id, status_id, order_index } = req.body;
        
        if (!title) {
            return res.status(400).json({ success: false, error: 'Job title is required' });
        }

        if (!assigned_to) {
            return res.status(400).json({ success: false, error: 'Job assignee is required' });
        }
        
        const projectActivity = await Activity.findOne({
            where: { project_id: project.id, hierarchy_level: 'project' }
        });
        
        const job = await Activity.create({
            title,
            description: description || '',
            project_id: project.id,
            parent_activity_id: projectActivity ? projectActivity.id : null,
            hierarchy_level: 'job',
            assignedToId: assigned_to,
            createdById: req.user.employeeCode,
            dueDate: due_date || null,
            estimated_hours_new: estimated_hours || 0,
            priority_id: priority_id || null,
            status_id: status_id || null,
            order_index: order_index || 0,
            status: 'pending',
            completion_percentage_new: 0,
            actual_hours_new: 0
        }, { transaction });
        
        if (assigned_to) {
            await ensureProjectMember(project.id, assigned_to, transaction);
        }
        
        await transaction.commit();
        
        const createdJob = await Activity.findByPk(job.id, {
            include: [
                { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name', 'email'] },
                { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
            ]
        });

        await notifyProjectUsers([{
            user: createdJob.assignedTo,
            eventType: 'job',
            project,
            item: createdJob,
            roleLabel: 'job assignee'
        }]);
        
        res.status(201).json({ success: true, job: createdJob });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating job:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create task under job
router.post('/:projectId/tasks', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { job_id, title, description, assigned_to, due_date, estimated_hours, priority_id, status_id, order_index } = req.body;
        
        const job = await Activity.findOne({
            where: { id: job_id, hierarchy_level: 'job' }
        });
        
        if (!job) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Job not found' });
        }
        
        if (!title) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Task title is required' });
        }

        if (!assigned_to) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Task assignee is required' });
        }

        if (assigned_to === ALL_EMPLOYEES_ASSIGNEE) {
            const employeeWhere = { role: 'employee' };
            if (['manager', 'senior_manager'].includes(req.user.role)) {
                if (req.user.managerType === 'branch') {
                    employeeWhere.branchId = req.user.branchId;
                } else {
                    employeeWhere.departmentId = req.user.departmentId;
                }
            }

            const employees = await User.findAll({
                where: employeeWhere,
                attributes: ['employeeCode', 'name', 'email']
            });

            if (employees.length === 0) {
                await transaction.rollback();
                return res.status(400).json({ success: false, error: 'No employees found for this assignment' });
            }

            const tasks = [];
            for (const employee of employees) {
                const task = await Activity.create({
                    title,
                    description: description || '',
                    project_id: req.params.projectId,
                    parent_activity_id: job.id,
                    hierarchy_level: 'task',
                    assignedToId: employee.employeeCode,
                    createdById: req.user.employeeCode,
                    dueDate: due_date || null,
                    estimated_hours_new: estimated_hours || 0,
                    priority_id: priority_id || null,
                    status_id: status_id || null,
                    order_index: order_index || 0,
                    status: 'pending',
                    completion_percentage_new: 0,
                    actual_hours_new: 0
                }, { transaction });

                await ensureProjectMember(req.params.projectId, employee.employeeCode, transaction);
                tasks.push(task);
            }

            await transaction.commit();

            const project = await PMProject.findByPk(req.params.projectId);
            const notificationSummary = await notifyProjectUsers(employees.map((employee, index) => ({
                user: employee,
                eventType: 'task',
                project,
                item: tasks[index],
                roleLabel: 'task assignee'
            })), {
                emailBatchSize: BULK_EMAIL_BATCH_SIZE,
                emailBatchDelayMs: BULK_EMAIL_BATCH_DELAY_MS
            });

            return res.status(201).json({
                success: true,
                tasks,
                count: tasks.length,
                notifications: notificationSummary,
                message: `Task assigned to ${tasks.length} employees. Email notifications sent in batches of ${BULK_EMAIL_BATCH_SIZE}.`
            });
        }
        
        const task = await Activity.create({
            title,
            description: description || '',
            project_id: req.params.projectId,
            parent_activity_id: job.id,
            hierarchy_level: 'task',
            assignedToId: assigned_to,
            createdById: req.user.employeeCode,
            dueDate: due_date || null,
            estimated_hours_new: estimated_hours || 0,
            priority_id: priority_id || null,
            status_id: status_id || null,
            order_index: order_index || 0,
            status: 'pending',
            completion_percentage_new: 0,
            actual_hours_new: 0
        }, { transaction });
        
        if (assigned_to) {
            await ensureProjectMember(req.params.projectId, assigned_to, transaction);
        }
        
        await transaction.commit();
        
        const createdTask = await Activity.findByPk(task.id, {
            include: [
                { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name', 'email'] },
                { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
            ]
        });

        const project = await PMProject.findByPk(req.params.projectId);
        await notifyProjectUsers([{
            user: createdTask.assignedTo,
            eventType: 'task',
            project,
            item: createdTask,
            roleLabel: 'task assignee'
        }]);
        
        res.status(201).json({ success: true, task: createdTask });
        
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating task:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add a member manually to a project
router.post('/:id/members', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
    try {
        const project = await PMProject.findByPk(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        const { user_id, role = 'member' } = req.body;
        if (!user_id) {
            return res.status(400).json({ success: false, error: 'Select an employee to add' });
        }

        const employee = await User.findOne({ where: { employeeCode: user_id } });
        if (!employee) {
            return res.status(404).json({ success: false, error: 'Employee not found' });
        }

        const [member, created] = await PMProjectMember.findOrCreate({
            where: { project_id: project.id, user_id },
            defaults: { project_id: project.id, user_id, role }
        });

        if (!created && member.role !== role) {
            await member.update({ role });
        }

        const savedMember = await PMProjectMember.findOne({
            where: { project_id: project.id, user_id },
            include: [{ model: User, as: 'memberUser', attributes: ['employeeCode', 'name', 'email', 'role'] }]
        });

        await notifyProjectUsers([{
            user: savedMember.memberUser,
            eventType: 'member',
            project,
            roleLabel: savedMember.role
        }]);

        res.status(created ? 201 : 200).json({
            success: true,
            member: {
                ...savedMember.memberUser.toJSON(),
                projectRole: savedMember.role,
                joined_at: savedMember.joined_at
            },
            message: created ? 'Member added' : 'Member updated'
        });
    } catch (error) {
        console.error('Error adding project member:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Remove a manually added project member
router.delete('/:id/members/all-except-manager', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const project = await PMProject.findByPk(req.params.id, { transaction });
        if (!project) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Project not found' });
        }

        if (!project.project_manager) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Project manager is not assigned' });
        }

        await PMProjectMember.findOrCreate({
            where: { project_id: project.id, user_id: project.project_manager },
            defaults: { project_id: project.id, user_id: project.project_manager, role: 'manager' },
            transaction
        });

        const removedCount = await PMProjectMember.destroy({
            where: {
                project_id: project.id,
                user_id: { [Op.ne]: project.project_manager }
            },
            transaction
        });

        await transaction.commit();
        res.json({
            success: true,
            removedCount,
            message: removedCount
                ? `Removed ${removedCount} project member${removedCount === 1 ? '' : 's'}`
                : 'No extra members to remove'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error removing project members:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/:id/members/:userId', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
    try {
        const deleted = await PMProjectMember.destroy({
            where: {
                project_id: req.params.id,
                user_id: req.params.userId
            }
        });

        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Member not found' });
        }

        res.json({ success: true, message: 'Member removed' });
    } catch (error) {
        console.error('Error removing project member:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Clone project with edit mode data
router.post('/:id/clone', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { name, start_date, end_date, copy_members, edit_mode } = req.body;
        const originalProject = await PMProject.findByPk(req.params.id, {
            include: [
                { model: PmPriorityDefinition, as: 'priorityDefinition' },
                { model: PmStatusDefinition, as: 'statusDefinition' }
            ]
        });
        
        if (!originalProject) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const clonedProject = await PMProject.create({
            name: name || `${originalProject.name} (Copy)`,
            description: originalProject.description,
            departmentId: originalProject.departmentId,
            branchId: originalProject.branchId,
            start_date: start_date || originalProject.start_date,
            end_date: end_date || originalProject.end_date,
            priority_id: originalProject.priority_id,
            status_id: originalProject.status_id,
            priority: originalProject.priority,
            status: 'planning',
            created_by: req.user.employeeCode
        }, { transaction });
        
        const originalProjectActivity = await Activity.findOne({
            where: { project_id: originalProject.id, hierarchy_level: 'project' }
        });
        
        if (originalProjectActivity) {
            await Activity.create({
                title: originalProjectActivity.title,
                description: originalProjectActivity.description,
                project_id: clonedProject.id,
                hierarchy_level: 'project',
                assignedToId: originalProjectActivity.assignedToId,
                createdById: req.user.employeeCode,
                dueDate: originalProjectActivity.dueDate,
                completion_percentage_new: 0
            }, { transaction });
        }
        
        const originalJobs = await Activity.findAll({
            where: { project_id: originalProject.id, hierarchy_level: 'job' }
        });
        
        for (const job of originalJobs) {
            const clonedJob = await Activity.create({
                title: job.title,
                description: job.description,
                project_id: clonedProject.id,
                hierarchy_level: 'job',
                assignedToId: job.assignedToId,
                createdById: req.user.employeeCode,
                dueDate: job.dueDate,
                estimated_hours_new: job.estimated_hours_new,
                priority_id: job.priority_id,
                status_id: job.status_id,
                order_index: job.order_index,
                status: 'pending'
            }, { transaction });
            
            const originalTasks = await Activity.findAll({
                where: { parent_activity_id: job.id, hierarchy_level: 'task' }
            });
            
            for (const task of originalTasks) {
                await Activity.create({
                    title: task.title,
                    description: task.description,
                    project_id: clonedProject.id,
                    parent_activity_id: clonedJob.id,
                    hierarchy_level: 'task',
                    assignedToId: task.assignedToId,
                    createdById: req.user.employeeCode,
                    dueDate: task.dueDate,
                    estimated_hours_new: task.estimated_hours_new,
                    priority_id: task.priority_id,
                    status_id: task.status_id,
                    order_index: task.order_index,
                    status: 'pending'
                }, { transaction });
            }
        }
        
        if (copy_members) {
            const members = await PMProjectMember.findAll({
                where: { project_id: originalProject.id }
            });
            for (const member of members) {
                await PMProjectMember.create({
                    project_id: clonedProject.id,
                    user_id: member.user_id,
                    role: member.role
                }, { transaction });
            }
        }
        
        await PMProjectMember.create({
            project_id: clonedProject.id,
            user_id: req.user.employeeCode,
            role: 'owner'
        }, { transaction });
        
        await PMCloneLog.create({
            original_project_id: originalProject.id,
            cloned_project_id: clonedProject.id,
            cloned_by: req.user.employeeCode
        }, { transaction });
        
        await transaction.commit();
        
        if (edit_mode) {
            const fullProject = await PMProject.findByPk(clonedProject.id, {
                include: [
                    { model: PmPriorityDefinition, as: 'priorityDefinition' },
                    { model: PmStatusDefinition, as: 'statusDefinition' },
                    { model: Department, as: 'projectDepartment' },
                    { model: Branch, as: 'projectBranch' }
                ]
            });
            
            const members = await PMProjectMember.findAll({
                where: { project_id: clonedProject.id },
                include: [{ model: User, as: 'memberUser', attributes: ['employeeCode', 'name'] }]
            });
            
            const jobs = await Activity.findAll({
                where: { project_id: clonedProject.id, hierarchy_level: 'job' }
            });
            
            res.json({ 
                success: true, 
                project: fullProject,
                members: members.map(m => ({ user_id: m.user_id, role: m.role })),
                jobs,
                edit_mode: true,
                message: 'Project cloned successfully. You can now edit any details.'
            });
        } else {
            res.json({ success: true, project: clonedProject });
        }
    } catch (error) {
        await transaction.rollback();
        console.error('Error cloning project:', error);
        res.status(500).json({ error: error.message });
    }
});

// Request deadline extension
router.post('/:id/extend-deadline', auth, seniorProjectScope, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { entity_type, entity_id, new_deadline, reason } = req.body;
        
        let oldDeadline;
        let entity;
        
        if (entity_type === 'project') {
            entity = await PMProject.findByPk(entity_id);
            oldDeadline = entity.end_date;
        } else {
            entity = await Activity.findByPk(entity_id);
            oldDeadline = entity.dueDate ? entity.dueDate.split('T')[0] : null;
        }
        
        if (!entity) {
            return res.status(404).json({ error: 'Entity not found' });
        }
        
        const extension = await PMDeadlineExtension.create({
            entity_type,
            entity_id,
            old_deadline: oldDeadline,
            new_deadline,
            reason,
            requested_by: req.user.employeeCode,
            status: 'pending'
        }, { transaction });
        
        await transaction.commit();
        
        res.status(201).json({ 
            success: true, 
            extension,
            message: 'Extension request submitted. Waiting for approval.'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error requesting extension:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== PUT ENDPOINTS ====================

// Update project
router.put('/:id', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
    try {
        const project = await PMProject.findByPk(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        await project.update(req.body);
        
        const updatedProject = await PMProject.findByPk(project.id, {
            include: [
                { model: PmPriorityDefinition, as: 'priorityDefinition' },
                { model: PmStatusDefinition, as: 'statusDefinition' }
            ]
        });
        
        res.json({ success: true, project: updatedProject });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update job/task
router.put('/activities/:id', auth, seniorProjectScope, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        const isOwner = activity.assignedToId === req.user.employeeCode;
        const isManager = ['manager', 'senior_manager'].includes(req.user.role) || req.user.role === 'admin';
        
        if (!isOwner && !isManager) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const previousAssignee = activity.assignedToId;
        const updateData = { ...req.body };
        if (updateData.assigned_to) {
            updateData.assignedToId = updateData.assigned_to;
            delete updateData.assigned_to;
        }
        
        await activity.update(updateData);

        if (updateData.assignedToId && updateData.assignedToId !== previousAssignee) {
            await ensureProjectMember(activity.project_id, updateData.assignedToId);
            const [assignee, project] = await Promise.all([
                User.findOne({ where: { employeeCode: updateData.assignedToId }, attributes: ['employeeCode', 'name', 'email'] }),
                PMProject.findByPk(activity.project_id)
            ]);

            await notifyProjectUsers([{
                user: assignee,
                eventType: activity.hierarchy_level === 'job' ? 'job' : 'task',
                project,
                item: activity,
                roleLabel: `${activity.hierarchy_level || 'work'} assignee`
            }]);
        }
        
        res.json({ success: true, activity });
    } catch (error) {
        console.error('Error updating activity:', error);
        res.status(500).json({ error: error.message });
    }
});

// Approve or request redo for a submitted task/subtask without moving it to a separate review section.
router.put('/activities/:id/review', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager', 'teamlead']), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { action, comment } = req.body;
        const activity = await Activity.findByPk(req.params.id, {
            include: [
                { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name', 'email', 'teamLeadId'] },
                { model: User, as: 'createdBy', attributes: ['employeeCode', 'name', 'email'] }
            ],
            transaction
        });

        if (!activity) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Activity not found' });
        }

        if (!['task', 'subtask'].includes(activity.hierarchy_level)) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Only tasks and subtasks can be reviewed' });
        }

        if (activity.status !== 'submitted') {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Task is not submitted for review' });
        }

        if (req.user.role === 'teamlead') {
            const isOwnTeamMember = activity.assignedTo?.teamLeadId === req.user.employeeCode;
            const wasCreatedByLead = activity.createdById === req.user.employeeCode;
            if (!isOwnTeamMember && !wasCreatedByLead) {
                await transaction.rollback();
                return res.status(403).json({ success: false, error: 'You can only review work from your team' });
            }
        }

        if (action === 'approve') {
            await activity.update({
                status: 'completed',
                completion_percentage_new: 100,
                reviewerComment: comment || null,
                reviewedAt: new Date(),
                completedAt: new Date()
            }, { transaction });
        } else if (action === 'redo') {
            await activity.update({
                status: 'needs_changes',
                completion_percentage_new: 80,
                needsChangesComments: comment || null,
                reviewedAt: new Date(),
                rejectionCount: (activity.rejectionCount || 0) + 1
            }, { transaction });
        } else {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Action must be approve or redo' });
        }

        await recalculateProjectHierarchy(activity.project_id, transaction);
        await transaction.commit();

        const project = await PMProject.findByPk(activity.project_id);
        const eventType = action === 'approve' ? 'review_approved' : 'review_redo';
        const roleLabel = action === 'approve' ? 'approved work' : 'redo requested';

        await notifyProjectUsers([{
            user: activity.assignedTo,
            eventType,
            project,
            item: await Activity.findByPk(activity.id),
            roleLabel
        }]);

        res.json({
            success: true,
            activity: await Activity.findByPk(activity.id),
            message: action === 'approve' ? 'Task approved' : 'Redo requested'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error reviewing activity:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Approve deadline extension
router.put('/extensions/:id/approve', auth, seniorProjectScope, checkRole(['admin', 'manager', 'senior_manager']), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { approve } = req.body;
        const extension = await PMDeadlineExtension.findByPk(req.params.id);
        
        if (!extension) {
            return res.status(404).json({ error: 'Extension request not found' });
        }
        
        if (approve) {
            if (extension.entity_type === 'project') {
                await PMProject.update(
                    { end_date: extension.new_deadline },
                    { where: { id: extension.entity_id }, transaction }
                );
            } else {
                await Activity.update(
                    { dueDate: extension.new_deadline },
                    { where: { id: extension.entity_id }, transaction }
                );
            }
            
            await extension.update({
                status: 'approved',
                approved_by: req.user.employeeCode,
                approved_at: new Date()
            }, { transaction });
        } else {
            await extension.update({
                status: 'rejected',
                approved_by: req.user.employeeCode,
                approved_at: new Date()
            }, { transaction });
        }
        
        await transaction.commit();
        
        res.json({ 
            success: true, 
            extension,
            message: approve ? 'Extension approved and deadline updated' : 'Extension rejected'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error processing extension:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== DELETE ENDPOINTS ====================

// Delete project
router.delete('/:id', auth, seniorProjectScope, checkRole(['admin']), async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const project = await PMProject.findByPk(req.params.id);
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        await Activity.destroy({
            where: { project_id: project.id },
            transaction
        });
        
        await PMProjectMember.destroy({
            where: { project_id: project.id },
            transaction
        });
        
        await project.destroy({ transaction });
        
        await transaction.commit();
        res.json({ success: true, message: 'Project deleted' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting project:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete job/task
router.delete('/activities/:id', auth, seniorProjectScope, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        
        if (!['admin', 'manager', 'senior_manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        
        await Activity.destroy({
            where: { parent_activity_id: activity.id },
            transaction
        });
        
        await activity.destroy({ transaction });
        
        await transaction.commit();
        res.json({ success: true, message: 'Activity deleted' });
    } catch (error) {
        await transaction.rollback();
        console.error('Error deleting activity:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
