const { DataTypes } = require("sequelize");
const sequelize = require("../config/sequelize");
const DepartmentModel = require("./Department");

// ==================== Activity ====================
const Activity = sequelize.define(
  "Activity",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assignedToId: {
      type: DataTypes.STRING, // FK -> User.employeeCode
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        "pending",
        "accepted",
        "in-progress",
        "submitted",
        "needs_changes",
        "approved",
        "completed",
        "rejected",
        "cancelled",
        "deleted"
      ),
      defaultValue: "pending",
    },
    departmentId: {
      type: DataTypes.INTEGER, // FK -> Department
      allowNull: true,
    },
    branchId: {
      type: DataTypes.INTEGER, // FK -> Branch
      allowNull: true,
    },
    createdById: {
      type: DataTypes.STRING, // FK -> User.employeeCode
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
    },
    // store array of time entry objects in JSON column
    timeEntries: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    timeSpent: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      validate: { min: 0 },
    },
    startTime: {
      type: DataTypes.STRING,
    },
    endTime: {
      type: DataTypes.STRING,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    institute: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0 },
    },
    school: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0 },
    },
    sessionType: {
      type: DataTypes.ENUM("Online", "Offline"),
      allowNull: true,
    },
    schoolName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    branchLocation: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    sessionsCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: { min: 0 },
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    hierarchy_level: {
      type: DataTypes.ENUM("project", "job", "task", "subtask"),
      allowNull: true,
    },
    parent_activity_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    job_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    due_date: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue("dueDate");
      },
      set(value) {
        this.setDataValue("dueDate", value || null);
      },
    },
    priority_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium",
    },
    estimated_hours_new: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    actual_hours_new: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    completion_percentage_new: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    order_index: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reviewedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reviewerComment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    needsChangesComments: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    completionNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    qualityScore: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    rejectionCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    isOverdue: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    notifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt
    tableName: "activities",
  }
);

// ==================== Activity Time Entries ====================
const ActivityTimeEntry = sequelize.define(
  "ActivityTimeEntry",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    punchIn: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    punchOut: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: true,
    tableName: "activity_time_entries",
  }
);

// ==================== Activity Template ====================
const ActivityTemplate = sequelize.define(
  "ActivityTemplate",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    departmentId: {
      type: DataTypes.INTEGER, // FK -> Department
      allowNull: false,
    },
    createdById: {
      type: DataTypes.STRING, // FK -> User.employeeCode
      allowNull: false,
    },
  },
  {
    timestamps: true,
    tableName: "activity_templates",
  }
);

// ==================== Associations ====================

// Activity has many Time Entries
Activity.hasMany(ActivityTimeEntry, { foreignKey: "activityId", onDelete: "CASCADE" });
ActivityTimeEntry.belongsTo(Activity, { foreignKey: "activityId" });

// Activity belongs to Template
Activity.belongsTo(ActivityTemplate, { foreignKey: "templateId" });
ActivityTemplate.hasMany(Activity, { foreignKey: "templateId" });

// Activity ↔ Users (assignedTo & createdBy)
Activity.belongsTo(require("./User"), { as: "assignedTo", foreignKey: "assignedToId", targetKey: "employeeCode" });
Activity.belongsTo(require("./User"), { as: "createdBy", foreignKey: "createdById", targetKey: "employeeCode" });

// Activity ↔ Department
const DepartmentAssociation = require("./Department");
Activity.belongsTo(DepartmentAssociation, { as: "department", foreignKey: "departmentId" });

// Activity ↔ Branch
Activity.belongsTo(require("./Branch"), { as: "branch", foreignKey: "branchId" });

// Activity hierarchy used by project/job/task assignment.
Activity.belongsTo(Activity, { as: "parentActivity", foreignKey: "parent_activity_id" });
Activity.hasMany(Activity, { as: "childActivities", foreignKey: "parent_activity_id" });
Activity.belongsTo(Activity, { as: "job", foreignKey: "job_id" });
Activity.hasMany(Activity, { as: "jobActivities", foreignKey: "job_id" });

ActivityTemplate.belongsTo(DepartmentModel, { as: "department", foreignKey: "departmentId" });
DepartmentModel.hasMany(ActivityTemplate, { as: "activityTemplates", foreignKey: "departmentId" });

module.exports = {
  Activity,
  ActivityTimeEntry,
  ActivityTemplate,
};
