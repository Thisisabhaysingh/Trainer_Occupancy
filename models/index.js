const sequelize = require("../config/sequelize");
const { DataTypes } = require("sequelize");

// Import models
const User = require("./User");
const Branch = require("./Branch");
const { Activity, ActivityTimeEntry, ActivityTemplate } = require("./Activity");
const SchoolCatalog = require("./SchoolCatalog");
const Department = require("./Department");
const Holiday = require("./Holiday");
const Workday = require("./Workday");
const Project = require("./Project");
const Job = require("./Job");
const Task = require("./Task");
const TaskComment = require("./TaskComment");
const Template = require("./Template");
const Notification = require("./Notification");
const PasswordResetOtp = require("./PasswordResetOtp");
const inventoryModels = require("../modules/inventory/inventory.models");

const ToolAssignment = require("./ToolAssignment");
const TrainerOccupancy = require("./TrainerOccupancy");
const TrainerActivityAssignment = require("./TrainerActivityAssignment");
const TrainerSchoolAssignment = require("./TrainerSchoolAssignment");
const TrainerSchoolTimetableTemplate = require("./TrainerSchoolTimetableTemplate");
const TrainerSchoolRoster = require("./TrainerSchoolRoster");
const TrainerLeaderboard = require("./TrainerLeaderboard");
const { SchoolActivityMailSetting, SchoolActivityMailLog, SchoolMailContact } = require("./SchoolActivityMail");
const SchoolCurriculumCourse = require("./SchoolCurriculumCourse");
const SchoolCurriculumSession = require("./SchoolCurriculumSession");
const SchoolCurriculumActivityOverride = require("./SchoolCurriculumActivityOverride");
const { ManagerSchoolAssignment, ManagerTrainerAssignment } = require("./ManagerAssignment");
const { SchoolAcademicSession, SchoolAcademicTerm, SchoolClass, SchoolClassCourse } = require("./SchoolManagement");

const PMProject = require("./pm_projects")(sequelize, DataTypes);
const PMProjectMember = require("./pm_project_members")(sequelize, DataTypes);
const PMDeadlineExtension = require("./pm_deadline_extensions")(sequelize, DataTypes);
const PMCloneLog = require("./pm_clone_log")(sequelize, DataTypes);
const PmPriorityDefinition = require("./pm_priority_definitions")(sequelize, DataTypes);
const PmStatusDefinition = require("./pm_status_definitions")(sequelize, DataTypes);

// ==================== Associations ====================

// Branch ↔ Manager (User)
Branch.belongsTo(User, { as: "manager", foreignKey: "managerId", targetKey: "employeeCode" });
Branch.hasMany(User, { foreignKey: "branchId", sourceKey: "id", as: "branchUsers" });
User.belongsTo(Branch, { foreignKey: "branchId", targetKey: "id", as: "branch" });

Branch.hasMany(Project, { foreignKey: "branchId", sourceKey: "id", as: "projects" });

// Department ↔ Branch
Department.belongsTo(Branch, { foreignKey: "branchId", targetKey: "id", as: "branch" });
Branch.hasMany(Department, { foreignKey: "branchId", sourceKey: "id", as: "departments" });

// Department ↔ Team Lead (User)
Department.belongsTo(User, { as: "teamLead", foreignKey: "teamLeadId", targetKey: "employeeCode" });

// Department ↔ Manager (User)
Department.belongsTo(User, { as: "manager", foreignKey: "managerId", targetKey: "employeeCode" });

// Department ↔ Users
Department.hasMany(User, { foreignKey: "departmentId", sourceKey: "id", as: "employees" });
User.belongsTo(Department, { foreignKey: "departmentId", targetKey: "id", as: "department" });

// Team lead assignment for employees
User.belongsTo(User, { as: "teamLead", foreignKey: "teamLeadId", targetKey: "employeeCode" });
User.hasMany(User, { as: "teamMembers", foreignKey: "teamLeadId", sourceKey: "employeeCode" });

// Department ↔ ToolAssignment
Department.hasOne(ToolAssignment, { foreignKey: "departmentId", sourceKey: "id", as: "toolAssignment" });
ToolAssignment.belongsTo(Department, { foreignKey: "departmentId", targetKey: "id", as: "department" });

// Trainer leaderboard ↔ User
TrainerLeaderboard.belongsTo(User, { as: "trainer", foreignKey: "userId", targetKey: "employeeCode" });
User.hasMany(TrainerLeaderboard, { as: "leaderboardEntries", foreignKey: "userId", sourceKey: "employeeCode" });

// Activity, Holiday, and Workday associations are defined within their model files to avoid duplicate aliases
User.hasMany(require("./Activity").Activity, { as: "activities", foreignKey: "assignedToId", sourceKey: "employeeCode" });

// Project Management associations
Project.belongsTo(User, { as: "owner", foreignKey: "ownerId", targetKey: "employeeCode", constraints: false });
Project.belongsTo(Department, { as: "department", foreignKey: "departmentId" });
Project.belongsTo(Branch, { as: "branch", foreignKey: "branchId" });
Project.hasMany(Job, { as: "jobs", foreignKey: "projectId", constraints: false });

Job.belongsTo(Project, { as: "project", foreignKey: "projectId", constraints: false });
Job.belongsTo(User, { as: "owner", foreignKey: "ownerId", targetKey: "employeeCode", constraints: false });
Job.hasMany(Task, { as: "tasks", foreignKey: "jobId", constraints: false });

Task.belongsTo(Job, { as: "job", foreignKey: "jobId", constraints: false });
Task.belongsTo(User, { as: "assignee", foreignKey: "assigneeId", targetKey: "employeeCode", constraints: false });
Task.belongsTo(User, { as: "createdBy", foreignKey: "createdById", targetKey: "employeeCode", constraints: false });
Task.hasMany(TaskComment, { as: "comments", foreignKey: "taskId", constraints: false });

TaskComment.belongsTo(Task, { as: "task", foreignKey: "taskId", constraints: false });
TaskComment.belongsTo(User, { as: "author", foreignKey: "authorId", targetKey: "employeeCode", constraints: false });

// Project assignment associations from the PM module.
PMProject.belongsTo(Department, { as: "projectDepartment", foreignKey: "departmentId" });
PMProject.belongsTo(Branch, { as: "projectBranch", foreignKey: "branchId" });
PMProject.belongsTo(User, { as: "projectManager", foreignKey: "project_manager", targetKey: "employeeCode" });
PMProject.belongsTo(User, { as: "projectCreator", foreignKey: "created_by", targetKey: "employeeCode" });
PMProject.belongsTo(PmPriorityDefinition, { as: "priorityDefinition", foreignKey: "priority_id" });
PMProject.belongsTo(PmStatusDefinition, { as: "statusDefinition", foreignKey: "status_id" });

PMProject.belongsToMany(User, {
  as: "projectMembers",
  through: PMProjectMember,
  foreignKey: "project_id",
  otherKey: "user_id",
});

PMProjectMember.belongsTo(PMProject, { as: "memberProject", foreignKey: "project_id" });
PMProjectMember.belongsTo(User, { as: "memberUser", foreignKey: "user_id", targetKey: "employeeCode" });

PMDeadlineExtension.belongsTo(User, { as: "requester", foreignKey: "requested_by", targetKey: "employeeCode" });
PMDeadlineExtension.belongsTo(User, { as: "approver", foreignKey: "approved_by", targetKey: "employeeCode" });
PMDeadlineExtension.belongsTo(Activity, { as: "entity", foreignKey: "entity_id" });
Activity.hasMany(PMDeadlineExtension, { as: "extensions", foreignKey: "entity_id" });

PMCloneLog.belongsTo(PMProject, { as: "original", foreignKey: "original_project_id" });
PMCloneLog.belongsTo(PMProject, { as: "cloned", foreignKey: "cloned_project_id" });
PMCloneLog.belongsTo(User, { as: "cloner", foreignKey: "cloned_by", targetKey: "employeeCode" });

Activity.belongsTo(PMProject, { as: "project", foreignKey: "project_id" });
PMProject.hasMany(Activity, { as: "activities", foreignKey: "project_id" });
Activity.belongsTo(PmPriorityDefinition, { as: "priorityDef", foreignKey: "priority_id" });
Activity.belongsTo(PmStatusDefinition, { as: "statusDef", foreignKey: "status_id" });

// ==================== Export ====================
module.exports = {
  sequelize,
  User,
  Branch,
  Activity,
  ActivityTimeEntry,
  ActivityTemplate,
  Department,
  Holiday,
  Workday,
  SchoolCatalog,
  ToolAssignment,
  TrainerOccupancy,
  TrainerActivityAssignment,
  TrainerSchoolAssignment,
  TrainerSchoolTimetableTemplate,
  TrainerSchoolRoster,
  TrainerLeaderboard,
  SchoolActivityMailSetting,
  SchoolActivityMailLog,
  SchoolMailContact,
  SchoolCurriculumCourse,
  SchoolCurriculumSession,
  SchoolCurriculumActivityOverride,
  ManagerSchoolAssignment,
  ManagerTrainerAssignment,
  SchoolAcademicSession,
  SchoolAcademicTerm,
  SchoolClass,
  SchoolClassCourse,
  Project,
  Job,
  Task,
  Template,
  Notification,
  PasswordResetOtp,
  ...inventoryModels,
  TaskComment,
  PMProject,
  PMProjectMember,
  PMDeadlineExtension,
  PMCloneLog,
  PmPriorityDefinition,
  PmStatusDefinition,
};
