const express = require('express');
const router = express.Router();
router.get('/ping', (req, res) => {
    res.json({ message: 'pong', time: new Date().toISOString() });
});
const { sequelize, Activity, PMProject, PMProjectMember, PMDeadlineExtension, PmPriorityDefinition, PmStatusDefinition, User, Workday } = require('../../models');
const { auth } = require('../../middleware/auth');
const { Op } = require('sequelize');
const { notifyProjectEvent } = require('../../services/emailService');
const { createInAppNotification } = require('../../services/notificationService');

const TIMEZONE_OFFSET_MINUTES = 330; // IST (+05:30)

const parseTimeParts = (timeString) => {
    if (typeof timeString !== 'string') return null;
    const parts = timeString.split(':').map(part => Number.parseInt(part, 10));
    if (parts.length < 2) return null;
    const [hours, minutes, seconds = 0] = parts;
    if ([hours, minutes, seconds].some(Number.isNaN)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) return null;
    return { hours, minutes, seconds };
};

const buildTodayDateWithTime = (timeString) => {
    const parts = parseTimeParts(timeString);
    if (!parts) return null;

    const now = new Date();
    const localNow = new Date(now.getTime() + TIMEZONE_OFFSET_MINUTES * 60 * 1000);
    const utcMs = Date.UTC(
        localNow.getUTCFullYear(),
        localNow.getUTCMonth(),
        localNow.getUTCDate(),
        parts.hours,
        parts.minutes,
        parts.seconds || 0,
        0
    ) - TIMEZONE_OFFSET_MINUTES * 60 * 1000;

    return new Date(utcMs);
};

const toIstDateOnlyString = (date = new Date()) => {
    const localDate = new Date(date.getTime() + TIMEZONE_OFFSET_MINUTES * 60 * 1000);
    const year = localDate.getUTCFullYear();
    const month = String(localDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(localDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ensureAttendanceMarkedForTaskTime = async (user, transaction) => {
    const today = toIstDateOnlyString();
    const workday = await Workday.findOne({
        where: { userId: user.employeeCode, date: today },
        transaction
    });

    if (!workday || !['full_day', 'half_day'].includes(workday.attendanceType) || !workday.clockIn) {
        return {
            allowed: false,
            status: 400,
            error: 'Please mark login / attendance first, then log task time.'
        };
    }

    if (workday.clockOut) {
        return {
            allowed: false,
            status: 400,
            error: 'You are already logged out for today. Please update attendance before logging task time.'
        };
    }

    return { allowed: true, workday };
};

const getTaskTimeEntries = (task) => {
    if (!task?.timeEntries) return [];
    if (Array.isArray(task.timeEntries)) return task.timeEntries;
    if (typeof task.timeEntries === 'string') {
        try {
            const parsed = JSON.parse(task.timeEntries);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const hasTaskLoggedTime = (task) =>
    getTaskTimeEntries(task).length > 0 || Number(task?.actual_hours_new || task?.actual_hours || 0) > 0;

const isTaskLockedForTime = (task) =>
    ['submitted', 'completed', 'approved'].includes(task?.status) ||
    Boolean(task?.completedAt);

const isTaskAlreadyCompletedOrSubmitted = (task) =>
    ['submitted', 'completed', 'approved'].includes(task?.status) ||
    Boolean(task?.completedAt);

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

const sendReviewNotifications = async ({ task, eventType, roleLabel, excludeEmployeeCode }) => {
    const project = await PMProject.findByPk(task.project_id);
    if (!project) return;

    const recipientCodes = new Set();
    if (project.project_manager) recipientCodes.add(project.project_manager);

    const members = await PMProjectMember.findAll({ where: { project_id: task.project_id } });
    members.forEach((member) => {
        if (member.user_id) recipientCodes.add(member.user_id);
    });

    if (excludeEmployeeCode) recipientCodes.delete(excludeEmployeeCode);

    const users = await User.findAll({
        where: { employeeCode: { [Op.in]: Array.from(recipientCodes) } },
        attributes: ['employeeCode', 'name', 'email']
    });

    await Promise.all(users.map(async (user) => {
        const notification = { user, eventType, project, item: task, roleLabel };
        try {
            await createInAppNotification(notification);
        } catch (error) {
            console.warn('Review in-app notification failed:', error.message);
        }
        try {
            await notifyProjectEvent(notification);
        } catch (error) {
            console.warn('Review email notification failed:', error.message);
        }
    }));
};

// Get user's projects only when they have an assigned job/task in the project.
router.get('/my-projects', auth, async (req, res) => {
    try {
        const employeeCode = req.user.employeeCode;
        console.log('Fetching projects for employee:', employeeCode);

        const assignedActivities = await Activity.findAll({
            where: {
                assignedToId: employeeCode,
                hierarchy_level: { [Op.in]: ['task', 'job', 'subtask'] }
            },
            attributes: ['project_id'],
            group: ['project_id']
        });
        const assignedProjectIds = assignedActivities.map(a => a.project_id).filter(id => id);
        console.log('Projects from assigned tasks:', assignedProjectIds);

        const allProjectIds = [...new Set(assignedProjectIds)];
        console.log('All project IDs:', allProjectIds);

        if (allProjectIds.length === 0) {
            return res.json({ success: true, projects: [] });
        }

        // Fetch projects with details
        const projects = await PMProject.findAll({
            where: { id: { [Op.in]: allProjectIds } },
            include: [
                { model: User, as: 'projectManager', attributes: ['employeeCode', 'name'] },
                { model: User, as: 'projectCreator', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDefinition', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDefinition', attributes: ['id', 'name', 'color'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        // For each project, calculate user's role and executable task counts.
        // Jobs are planning containers, so they should not be counted as tasks.
        const projectsWithDetails = await Promise.all(projects.map(async (project) => {
            const myTasksCount = await Activity.count({
                where: {
                    project_id: project.id,
                    assignedToId: employeeCode,
                    hierarchy_level: { [Op.in]: ['task', 'subtask'] }
                }
            });

            const assignedBy = await Activity.findOne({
                where: {
                    project_id: project.id,
                    assignedToId: employeeCode,
                    hierarchy_level: { [Op.in]: ['task', 'job', 'subtask'] }
                },
                include: [{ model: User, as: 'createdBy', attributes: ['employeeCode', 'name'] }],
                limit: 1
            });

            return {
                ...project.toJSON(),
                userRole: 'task_assignee',
                my_tasks_count: myTasksCount,
                completed_tasks_count: await Activity.count({
                    where: {
                        project_id: project.id,
                        assignedToId: employeeCode,
                        hierarchy_level: { [Op.in]: ['task', 'subtask'] },
                        status: 'completed'
                    }
                }),
                assigned_by: assignedBy?.createdBy?.name || project.projectManager?.name || 'Admin',
                assigned_via: 'task_assignment'
            };
        }));

        console.log('Returning projects:', projectsWithDetails.length);
        res.json({ success: true, projects: projectsWithDetails });

    } catch (error) {
        console.error('Error fetching my projects:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get employee's calendar events (tasks with deadlines)
router.get('/calendar', auth, async (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let dueDateFilter = {};
        if (start_date && end_date) {
            dueDateFilter = {
                dueDate: {
                    [Op.between]: [start_date, end_date]
                }
            };
        }

        // Get tasks assigned to employee
        const tasks = await Activity.findAll({
            where: {
                assignedToId: req.user.employeeCode,
                hierarchy_level: { [Op.in]: ['task', 'job', 'subtask'] },
                ...dueDateFilter
            },
            include: [
                { model: PMProject, as: 'project', attributes: ['id', 'name'] },
                { model: User, as: 'createdBy', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
            ],
            order: [['dueDate', 'ASC']]
        });

        // Format for calendar display
        const calendarEvents = tasks.map(task => {
            return {
                id: task.id,
                title: task.title,
                description: task.description,
                due_date: task.dueDate,
                dueDate: task.dueDate,
                project_name: task.project ? task.project.name : null,
                assigned_by: task.createdBy?.name || 'Admin',
                status: task.status,
                priority_name: task.priorityDef ? task.priorityDef.name : null,
                priority_color: task.priorityDef ? task.priorityDef.color : '#ff9800',
                status_name: task.statusDef ? task.statusDef.name : null,
                status_color: task.statusDef ? task.statusDef.color : '#6c757d',
                completion: task.completion_percentage_new,
                estimated_hours: task.estimated_hours_new,
                actual_hours: task.actual_hours_new,
                hierarchy_level: task.hierarchy_level
            };
        });

        res.json({ success: true, events: calendarEvents });
    } catch (error) {
        console.error('Error fetching calendar:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user's tasks for a specific project. Access requires an assigned job/task.
router.get('/projects/:projectId/tasks', auth, async (req, res) => {
    try {
        const { projectId } = req.params;
        const employeeCode = req.user.employeeCode;

        const hasTasks = await Activity.findOne({
            where: {
                project_id: projectId,
                assignedToId: employeeCode,
                hierarchy_level: { [Op.in]: ['task', 'job', 'subtask'] }
            }
        });

        if (!hasTasks) {
            return res.status(403).json({ error: 'No access to this project' });
        }

        const tasks = await Activity.findAll({
            where: {
                project_id: projectId,
                assignedToId: employeeCode,
                hierarchy_level: { [Op.in]: ['task', 'job', 'subtask'] }
            },
            include: [
                { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name'] },
                { model: User, as: 'createdBy', attributes: ['employeeCode', 'name'] },
                { model: Activity, as: 'parentActivity', attributes: ['id', 'title'] },
                { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
            ],
            order: [['dueDate', 'ASC']]
        });

        // Get project details
        const project = await PMProject.findByPk(projectId, {
            include: [
                { model: User, as: 'projectManager', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDefinition' },
                { model: PmStatusDefinition, as: 'statusDefinition' }
            ]
        });

        const taskJson = tasks.map(task => task.toJSON());
        const teamMemberCodes = req.user.role === 'teamlead'
            ? (await User.findAll({
                where: { teamLeadId: employeeCode },
                attributes: ['employeeCode']
            })).map(member => member.employeeCode)
            : [];

        if (req.user.role === 'teamlead') {
            const assignedJobIds = taskJson
                .filter(task => task.hierarchy_level === 'job' && task.assignedToId === employeeCode)
                .map(task => task.id);

            if (assignedJobIds.length > 0 && teamMemberCodes.length > 0) {
                const childTasks = await Activity.findAll({
                    where: {
                        project_id: projectId,
                        hierarchy_level: 'task',
                        assignedToId: { [Op.in]: teamMemberCodes },
                        [Op.or]: [
                            { parent_activity_id: { [Op.in]: assignedJobIds } },
                            { job_id: { [Op.in]: assignedJobIds } }
                        ]
                    },
                    include: [
                        { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name'] },
                        { model: User, as: 'createdBy', attributes: ['employeeCode', 'name'] },
                        { model: Activity, as: 'parentActivity', attributes: ['id', 'title'] },
                        { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                        { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
                    ],
                    order: [['order_index', 'ASC'], ['createdAt', 'ASC']]
                });

                const existingIds = new Set(taskJson.map(task => task.id));
                childTasks.forEach((childTask) => {
                    if (!existingIds.has(childTask.id)) {
                        taskJson.push({ ...childTask.toJSON(), viewOnlyForLead: true });
                    }
                });
            }
        }

        for (const task of taskJson) {
            if (req.user.role === 'teamlead' && task.hierarchy_level !== 'subtask') {
                task.subtasks = await Activity.findAll({
                    where: {
                        parent_activity_id: task.id,
                        hierarchy_level: 'subtask',
                        [Op.or]: [
                            { createdById: employeeCode },
                            { assignedToId: { [Op.in]: teamMemberCodes } }
                        ]
                    },
                    include: [
                        { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name'] },
                        { model: User, as: 'createdBy', attributes: ['employeeCode', 'name'] },
                        { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                        { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
                    ],
                    order: [['order_index', 'ASC'], ['createdAt', 'ASC']]
                });
            }
        }

        res.json({
            success: true,
            project: {
                ...project.toJSON(),
                userRole: 'task_assignee'
            },
            tasks: taskJson
        });
    } catch (error) {
        console.error('Error fetching project tasks:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/team-members', auth, async (req, res) => {
    try {
        if (req.user.role !== 'teamlead') {
            return res.status(403).json({ success: false, error: 'Only Team Leads can view team members' });
        }

        const members = await User.findAll({
            where: { teamLeadId: req.user.employeeCode },
            attributes: ['employeeCode', 'name', 'email', 'role'],
            order: [['name', 'ASC']]
        });

        res.json({ success: true, members });
    } catch (error) {
        console.error('Error fetching team members:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/tasks/:taskId/subtasks', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        if (req.user.role !== 'teamlead') {
            await transaction.rollback();
            return res.status(403).json({ success: false, error: 'Only Team Leads can create subtasks' });
        }

        const { taskId } = req.params;
        const { title, description, assigned_to, due_date, estimated_hours, priority_id, status_id, order_index } = req.body;

        if (!title) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Subtask title is required' });
        }

        if (!assigned_to) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Subtask assignee is required' });
        }

        const parentTask = await Activity.findOne({
            where: {
                id: taskId,
                assignedToId: req.user.employeeCode,
                hierarchy_level: { [Op.in]: ['job', 'task'] }
            },
            transaction
        });

        if (!parentTask) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Parent task not found or not assigned to you' });
        }

        const assignee = await User.findOne({
            where: {
                employeeCode: assigned_to,
                teamLeadId: req.user.employeeCode
            },
            transaction
        });

        if (!assignee) {
            await transaction.rollback();
            return res.status(403).json({ success: false, error: 'Assignee must be one of your team members' });
        }

        const subtask = await Activity.create({
            title,
            description: description || '',
            project_id: parentTask.project_id,
            parent_activity_id: parentTask.id,
            job_id: parentTask.hierarchy_level === 'job' ? parentTask.id : parentTask.job_id || parentTask.parent_activity_id,
            hierarchy_level: 'subtask',
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

        await PMProjectMember.findOrCreate({
            where: { project_id: parentTask.project_id, user_id: assigned_to },
            defaults: { role: 'member' },
            transaction
        });

        await transaction.commit();

        const createdSubtask = await Activity.findByPk(subtask.id, {
            include: [
                { model: User, as: 'assignedTo', attributes: ['employeeCode', 'name', 'email'] },
                { model: User, as: 'createdBy', attributes: ['employeeCode', 'name'] },
                { model: PmPriorityDefinition, as: 'priorityDef', attributes: ['id', 'name', 'color'] },
                { model: PmStatusDefinition, as: 'statusDef', attributes: ['id', 'name', 'color'] }
            ]
        });

        try {
            const project = await PMProject.findByPk(parentTask.project_id);
            const notification = {
                user: createdSubtask.assignedTo,
                eventType: 'task',
                project,
                item: createdSubtask,
                roleLabel: 'subtask assignee'
            };
            try {
                await createInAppNotification(notification);
            } catch (notificationError) {
                console.warn('Subtask in-app notification failed:', notificationError.message);
            }
            try {
                await notifyProjectEvent(notification);
            } catch (emailError) {
                console.warn('Subtask email notification failed:', emailError.message);
            }
        } catch (error) {
            console.warn('Subtask notification setup failed:', error.message);
        }

        res.status(201).json({ success: true, subtask: createdSubtask });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating subtask:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Log time against a task
router.post('/tasks/:taskId/log-time', auth, async (req, res) => {
    const sequelize = require('../../models').sequelize;
    const transaction = await sequelize.transaction();
    try {
        const { taskId } = req.params;
        const { startTime, endTime, notes, duration } = req.body;
        const durationMinutes = Number(duration);

        const task = await Activity.findOne({
            where: { id: taskId, assignedToId: req.user.employeeCode }
        });

        if (!task) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Task not found or not assigned to you' });
        }

        if (task.hierarchy_level === 'job') {
            await transaction.rollback();
            return res.status(400).json({ error: 'Jobs are containers. Please log time on a task or subtask.' });
        }

        if (isTaskLockedForTime(task)) {
            await transaction.rollback();
            return res.status(400).json({ error: 'This task is already marked complete or submitted for review. Time cannot be logged now.' });
        }

        const attendanceCheck = await ensureAttendanceMarkedForTaskTime(req.user, transaction);
        if (!attendanceCheck.allowed) {
            await transaction.rollback();
            return res.status(attendanceCheck.status).json({ error: attendanceCheck.error, code: 'ATTENDANCE_REQUIRED' });
        }

        const punchIn = buildTodayDateWithTime(startTime);
        const punchOut = buildTodayDateWithTime(endTime);

        if (!punchIn || !punchOut || !Number.isFinite(durationMinutes) || durationMinutes <= 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Valid start time, end time, and duration are required' });
        }

        if (punchOut <= punchIn) {
            await transaction.rollback();
            return res.status(400).json({ error: 'End time must be after start time' });
        }

        // Create time entry
        const timeEntries = task.timeEntries || [];
        const newEntry = {
            date: punchIn.toISOString(),
            punchIn: punchIn.toISOString(),
            punchOut: punchOut.toISOString(),
            duration: durationMinutes,
            description: notes || `${task.hierarchy_level || 'task'}: ${task.title}`,
            source: 'project_time_log'
        };

        timeEntries.push(newEntry);

        // Update actual hours
        const previousActualHours = Number(task.actual_hours_new) || 0;
        const newActualHours = previousActualHours + (durationMinutes / 60);

        task.set({
            timeEntries: timeEntries,
            actual_hours_new: newActualHours,
            timeSpent: newActualHours,
            startTime: task.startTime || startTime,
            endTime: endTime,
            status: task.status === 'pending' ? 'accepted' : (task.status === 'accepted' ? 'in-progress' : task.status),
            started_at: task.started_at || new Date()
        });
        task.changed('timeEntries', true);

        await task.save({ transaction });

        // Update completion percentage based on time logged vs estimated, capped at 80 until review.
        const estimatedHours = Number(task.estimated_hours_new) || 0;
        if (estimatedHours > 0) {
            const newCompletion = Math.min(80, (newActualHours / estimatedHours) * 100);
            await task.update({ completion_percentage_new: newCompletion }, { transaction });
        }

        await recalculateProjectHierarchy(task.project_id, transaction);
        await transaction.commit();

        res.json({
            success: true,
            task,
            message: 'Time logged successfully'
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error logging time:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add note to task
router.put('/tasks/:taskId/note', auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { note } = req.body;

        const task = await Activity.findOne({
            where: { id: taskId, assignedToId: req.user.employeeCode }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found or not assigned to you' });
        }

        await task.update({ comment: note });

        res.json({ success: true, message: 'Note saved successfully' });
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update task status
router.put('/tasks/:taskId/status', auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { status } = req.body;

        const task = await Activity.findOne({
            where: { id: taskId, assignedToId: req.user.employeeCode }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found or not assigned to you' });
        }

        if (status === 'submitted') {
            if (task.hierarchy_level === 'job') {
                return res.status(400).json({ error: 'Jobs are containers. Please submit a task or subtask for review.' });
            }

            if (['submitted', 'completed', 'approved'].includes(task.status)) {
                return res.status(400).json({ error: 'This task is already submitted or completed.' });
            }

            if (!task.completedAt) {
                return res.status(400).json({ error: 'Please mark the task complete before submitting for review.' });
            }

        }

        const updateData = { status };
        if (status === 'submitted') {
            updateData.completion_percentage_new = 90;
            updateData.submittedAt = new Date();
        }

        await task.update(updateData);
        await recalculateProjectHierarchy(task.project_id);

        if (status === 'submitted') {
            await sendReviewNotifications({
                task,
                eventType: 'review_submitted',
                roleLabel: 'reviewer',
                excludeEmployeeCode: req.user.employeeCode
            });
        }

        res.json({
            success: true,
            message: status === 'submitted' ? 'Task submitted for review. Progress is now 90%.' : 'Status updated successfully'
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark task as completed (submitted for review)
router.put('/tasks/:taskId/complete', auth, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { completion_notes } = req.body;

        const task = await Activity.findOne({
            where: { id: taskId, assignedToId: req.user.employeeCode }
        });

        if (!task) {
            return res.status(404).json({ error: 'Task not found or not assigned to you' });
        }

        if (task.hierarchy_level === 'job') {
            return res.status(400).json({ error: 'Jobs are containers. Please mark a task or subtask complete.' });
        }

        if (isTaskAlreadyCompletedOrSubmitted(task)) {
            return res.status(400).json({ error: 'This task is already marked complete or submitted for review.' });
        }

        if (!hasTaskLoggedTime(task)) {
            return res.status(400).json({ error: 'Please log time before marking this task complete.' });
        }

        await task.update({
            status: 'in-progress',
            completion_percentage_new: 80,
            completionNotes: completion_notes,
            completedAt: new Date()
        });
        await recalculateProjectHierarchy(task.project_id);

        res.json({
            success: true,
            task,
            message: 'Task marked complete. Submit for review when ready.'
        });
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/employee/tasks/:taskId/request-extension
router.post('/tasks/:taskId/request-extension', auth, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const employeeCode = req.user.employeeCode;
        const { taskId } = req.params;
        const { new_deadline, reason } = req.body;
        
        console.log(`Extension request for task ${taskId} by ${employeeCode}`);
        
        // Find the task/job
        const task = await Activity.findOne({
            where: {
                id: taskId,
                assignedToId: employeeCode
            }
        });
        
        if (!task) {
            return res.status(404).json({ success: false, error: 'Task not found or not assigned to you' });
        }
        
        // Check if there's already a pending extension request
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
        
        // Format dates properly
        const oldDeadline = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null;
        
        // Create extension request
        const extension = await PMDeadlineExtension.create({
            entity_type: 'task',
            entity_id: taskId,
            old_deadline: oldDeadline,
            new_deadline: new_deadline,
            reason: reason,
            requested_by: employeeCode,
            status: 'pending'
        }, { transaction });
        
        await transaction.commit();
        
        res.json({ 
            success: true, 
            message: 'Extension request submitted successfully. Manager will review.',
            extension: {
                id: extension.id,
                taskId: taskId,
                taskTitle: task.title,
                oldDeadline: oldDeadline,
                newDeadline: new_deadline,
                reason: reason,
                status: 'pending'
            }
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error requesting extension:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});



module.exports = router;
