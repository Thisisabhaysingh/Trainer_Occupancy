-- Server-safe schema and seed patch for MIS.
-- Purpose: bring an existing server database up to the current app schema
-- without deleting or replacing existing business data.
--
-- How to use:
--   1. Take a database backup first.
--   2. Run this against the target MIS database.
--   3. This patch is additive/defensive: CREATE IF NOT EXISTS, INSERT IGNORE,
--      and column checks through information_schema.

-- Inventory request categories are required by Create Request and approval routing.
-- Keep this additive and idempotent for databases upgraded in place.
CREATE TABLE IF NOT EXISTS `inventory_categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `parentId` INT DEFAULT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT TRUE,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inventory_categories_code` (`code`),
  KEY `idx_inventory_category_parent` (`parentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `inventory_categories` (`code`, `name`, `parentId`, `isActive`, `createdAt`, `updatedAt`) VALUES
  ('SCHOOL_INVENTORY', 'School Inventory', NULL, TRUE, NOW(), NOW()),
  ('STEM_LAB', 'STEM Lab', NULL, TRUE, NOW(), NOW()),
  ('TAKE_AWAY_KIT', 'Take Away Kit', NULL, TRUE, NOW(), NOW()),
  ('COMPETITION', 'Competition', NULL, TRUE, NOW(), NOW()),
  ('PTM', 'PTM', NULL, TRUE, NOW(), NOW()),
  ('SCHOOL_EVENT', 'School Event', NULL, TRUE, NOW(), NOW()),
  ('DEMO', 'Demo', NULL, TRUE, NOW(), NOW()),
  ('PROMOTIONAL_EVENT', 'Promotional Event', NULL, TRUE, NOW(), NOW()),
  ('RESEARCH_PROJECT', 'Research Project', NULL, TRUE, NOW(), NOW()),
  ('GENERAL_INTERNAL', 'General Internal', NULL, TRUE, NOW(), NOW());

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_column_if_missing $$
CREATE PROCEDURE add_column_if_missing(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS add_index_if_missing $$
CREATE PROCEDURE add_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', p_table, '` ADD ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS rename_activity_template_name_to_title $$
CREATE PROCEDURE rename_activity_template_name_to_title()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_templates'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_templates' AND COLUMN_NAME = 'title'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activity_templates' AND COLUMN_NAME = 'name'
  ) THEN
    ALTER TABLE `activity_templates` CHANGE COLUMN `name` `title` VARCHAR(255) NOT NULL;
  END IF;
END $$

DROP PROCEDURE IF EXISTS ensure_activity_enum_columns $$
CREATE PROCEDURE ensure_activity_enum_columns()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'activities'
      AND COLUMN_NAME = 'status'
  ) THEN
    ALTER TABLE `activities`
      MODIFY `status` ENUM(
        'pending','accepted','in-progress','submitted','needs_changes',
        'approved','completed','rejected','cancelled','deleted'
      ) DEFAULT 'pending';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'activities'
      AND COLUMN_NAME = 'hierarchy_level'
      AND COLUMN_TYPE NOT LIKE '%subtask%'
  ) THEN
    ALTER TABLE `activities`
      MODIFY `hierarchy_level` ENUM('project','job','task','subtask') DEFAULT NULL;
  END IF;
END $$

DROP PROCEDURE IF EXISTS sync_pm_project_compat_columns $$
CREATE PROCEDURE sync_pm_project_compat_columns()
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pm_projects' AND COLUMN_NAME = 'departmentId'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pm_projects' AND COLUMN_NAME = 'department_id'
  ) THEN
    UPDATE `pm_projects`
    SET `department_id` = `departmentId`
    WHERE `department_id` IS NULL AND `departmentId` IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pm_projects' AND COLUMN_NAME = 'branchId'
  )
  AND EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pm_projects' AND COLUMN_NAME = 'branch_id'
  ) THEN
    UPDATE `pm_projects`
    SET `branch_id` = `branchId`
    WHERE `branch_id` IS NULL AND `branchId` IS NOT NULL;
  END IF;
END $$

DELIMITER ;

-- ---------------------------------------------------------------------------
-- Core activity templates table compatibility
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `activity_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `departmentId` INT DEFAULT NULL,
  `createdById` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL rename_activity_template_name_to_title();
CALL add_column_if_missing('activity_templates', 'title', 'VARCHAR(255) NOT NULL DEFAULT '''' AFTER `id`');
CALL add_column_if_missing('activity_templates', 'departmentId', 'INT DEFAULT NULL AFTER `title`');
CALL add_column_if_missing('activity_templates', 'createdById', 'VARCHAR(255) DEFAULT NULL AFTER `departmentId`');
CALL add_column_if_missing('activity_templates', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `createdById`');
CALL add_column_if_missing('activity_templates', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `createdAt`');
CALL add_index_if_missing('activity_templates', 'idx_activity_templates_department', 'INDEX `idx_activity_templates_department` (`departmentId`)');

-- Required default templates for manager/employee activity screens.
-- These are inserted only where the same title+department pair does not exist.
INSERT INTO `activity_templates` (`title`, `departmentId`, `createdById`, `createdAt`, `updatedAt`)
SELECT seed.title, d.id, 'SYSTEM', NOW(), NOW()
FROM `departments` d
JOIN (
  SELECT 'Total No. of Sessions' AS title
  UNION ALL SELECT 'School Session'
  UNION ALL SELECT 'Institute Session'
  UNION ALL SELECT 'General - Lunch Break'
) seed
WHERE NOT EXISTS (
  SELECT 1
  FROM `activity_templates` at
  WHERE at.`departmentId` = d.`id`
    AND at.`title` = seed.`title`
);

-- ---------------------------------------------------------------------------
-- Users table compatibility
-- ---------------------------------------------------------------------------

CALL add_column_if_missing('users', 'managerType', 'ENUM(''branch'',''department'') DEFAULT NULL AFTER `role`');
CALL add_column_if_missing('users', 'departmentId', 'INT DEFAULT NULL AFTER `managerType`');
CALL add_column_if_missing('users', 'branchId', 'INT DEFAULT NULL AFTER `departmentId`');
CALL add_column_if_missing('users', 'teamLeadId', 'VARCHAR(255) DEFAULT NULL AFTER `branchId`');
CALL add_index_if_missing('users', 'idx_users_team_lead', 'INDEX `idx_users_team_lead` (`teamLeadId`)');

-- ---------------------------------------------------------------------------
-- School catalog and trainer occupancy
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `school_catalog` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL add_column_if_missing('school_catalog', 'name', 'VARCHAR(255) NOT NULL DEFAULT '''' AFTER `id`');
CALL add_column_if_missing('school_catalog', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_column_if_missing('school_catalog', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL add_index_if_missing('school_catalog', 'idx_school_catalog_name', 'INDEX `idx_school_catalog_name` (`name`)');

-- Non-destructive default. If id 1 already exists, this is ignored.
INSERT IGNORE INTO `school_catalog` (`id`, `name`, `createdAt`, `updatedAt`)
VALUES (1, 'DPS', NOW(), NOW());

CREATE TABLE IF NOT EXISTS `trainer_occupancies` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `employeeId` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `schoolId` INT DEFAULT NULL,
  `weekStart` DATE NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL add_column_if_missing('trainer_occupancies', 'employeeId', 'VARCHAR(255) NOT NULL AFTER `id`');
CALL add_column_if_missing('trainer_occupancies', 'date', 'DATE NOT NULL AFTER `employeeId`');
CALL add_column_if_missing('trainer_occupancies', 'schoolId', 'INT DEFAULT NULL AFTER `date`');
CALL add_column_if_missing('trainer_occupancies', 'weekStart', 'DATE NOT NULL AFTER `schoolId`');
CALL add_column_if_missing('trainer_occupancies', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_column_if_missing('trainer_occupancies', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL add_index_if_missing('trainer_occupancies', 'trainer_occupancies_employee_date_unique', 'UNIQUE KEY `trainer_occupancies_employee_date_unique` (`employeeId`, `date`)');
CALL add_index_if_missing('trainer_occupancies', 'trainer_occupancies_employee_week', 'INDEX `trainer_occupancies_employee_week` (`employeeId`, `weekStart`)');

-- ---------------------------------------------------------------------------
-- PM project/job/task/subtask module
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `pm_priority_definitions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `color` VARCHAR(7) DEFAULT '#0070F0',
  `level` INT DEFAULT 0,
  `applies_to` ENUM('project','task','job','all') DEFAULT 'all',
  `is_active` TINYINT(1) DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_priority_definitions_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pm_status_definitions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `color` VARCHAR(7) DEFAULT '#6c757d',
  `category` ENUM('not_started','in_progress','review','completed','closed','on_hold','cancelled') DEFAULT 'not_started',
  `is_active` TINYINT(1) DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_status_definitions_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pm_projects` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `departmentId` INT DEFAULT NULL,
  `branchId` INT DEFAULT NULL,
  `department_id` INT DEFAULT NULL,
  `branch_id` INT DEFAULT NULL,
  `start_date` DATE DEFAULT NULL,
  `end_date` DATE DEFAULT NULL,
  `project_manager` VARCHAR(255) DEFAULT NULL,
  `priority_id` INT DEFAULT NULL,
  `status_id` INT DEFAULT NULL,
  `priority` ENUM('low','medium','high','urgent') DEFAULT 'medium',
  `status` ENUM('planning','active','on_hold','completed','cancelled') DEFAULT 'planning',
  `progress` DECIMAL(5,2) DEFAULT 0,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL add_column_if_missing('pm_projects', 'department_id', 'INT DEFAULT NULL AFTER `description`');
CALL add_column_if_missing('pm_projects', 'branch_id', 'INT DEFAULT NULL AFTER `department_id`');
CALL add_column_if_missing('pm_projects', 'departmentId', 'INT DEFAULT NULL AFTER `branch_id`');
CALL add_column_if_missing('pm_projects', 'branchId', 'INT DEFAULT NULL AFTER `departmentId`');
CALL sync_pm_project_compat_columns();

CREATE TABLE IF NOT EXISTS `pm_project_members` (
  `project_id` INT NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `role` ENUM('owner','manager','member','viewer') DEFAULT 'member',
  `joined_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pm_deadline_extensions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `entity_type` ENUM('project','activity','task') NOT NULL,
  `entity_id` INT NOT NULL,
  `old_deadline` DATE DEFAULT NULL,
  `new_deadline` DATE NOT NULL,
  `reason` TEXT,
  `requested_by` VARCHAR(255) DEFAULT NULL,
  `requested_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `approved_by` VARCHAR(255) DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `status` ENUM('pending','approved','rejected') DEFAULT 'pending',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `pm_clone_log` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `original_project_id` INT DEFAULT NULL,
  `cloned_project_id` INT DEFAULT NULL,
  `cloned_by` VARCHAR(255) DEFAULT NULL,
  `cloned_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

INSERT IGNORE INTO `pm_priority_definitions` (`name`, `color`, `level`, `applies_to`, `sort_order`) VALUES
  ('Low', '#12B76A', 1, 'all', 1),
  ('Medium', '#F79009', 2, 'all', 2),
  ('High', '#F04438', 3, 'all', 3),
  ('Urgent', '#B42318', 4, 'all', 4);

INSERT IGNORE INTO `pm_status_definitions` (`name`, `color`, `category`, `sort_order`) VALUES
  ('Planning', '#17a2b8', 'not_started', 1),
  ('In Progress', '#007bff', 'in_progress', 2),
  ('Review', '#7c3aed', 'review', 3),
  ('Completed', '#28a745', 'completed', 4),
  ('On Hold', '#ffc107', 'on_hold', 5),
  ('Cancelled', '#dc3545', 'cancelled', 6);

-- Job template table used by Project Management > Create Template / Job Templates.
CREATE TABLE IF NOT EXISTS `templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `category` VARCHAR(255) DEFAULT NULL,
  `difficulty` ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  `jobs` JSON DEFAULT NULL,
  `createdById` VARCHAR(255) DEFAULT NULL,
  `updatedById` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL add_column_if_missing('templates', 'name', 'VARCHAR(255) NOT NULL DEFAULT '''' AFTER `id`');
CALL add_column_if_missing('templates', 'description', 'TEXT AFTER `name`');
CALL add_column_if_missing('templates', 'category', 'VARCHAR(255) DEFAULT NULL AFTER `description`');
CALL add_column_if_missing('templates', 'difficulty', 'ENUM(''Low'',''Medium'',''High'') NOT NULL DEFAULT ''Medium'' AFTER `category`');
CALL add_column_if_missing('templates', 'jobs', 'JSON DEFAULT NULL AFTER `difficulty`');
CALL add_column_if_missing('templates', 'createdById', 'VARCHAR(255) DEFAULT NULL AFTER `jobs`');
CALL add_column_if_missing('templates', 'updatedById', 'VARCHAR(255) DEFAULT NULL AFTER `createdById`');
CALL add_column_if_missing('templates', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_column_if_missing('templates', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- ---------------------------------------------------------------------------
-- Activities table additions used by project/job/task/subtask and sessions.
-- ---------------------------------------------------------------------------

CALL add_column_if_missing('activities', 'project_id', 'INT DEFAULT NULL');
CALL add_column_if_missing('activities', 'hierarchy_level', 'ENUM(''project'',''job'',''task'',''subtask'') DEFAULT NULL');
CALL add_column_if_missing('activities', 'parent_activity_id', 'INT DEFAULT NULL');
CALL add_column_if_missing('activities', 'job_id', 'INT DEFAULT NULL');
CALL add_column_if_missing('activities', 'dueDate', 'DATE DEFAULT NULL');
CALL add_column_if_missing('activities', 'priority_id', 'INT DEFAULT NULL');
CALL add_column_if_missing('activities', 'status_id', 'INT DEFAULT NULL');
CALL add_column_if_missing('activities', 'priority', 'ENUM(''low'',''medium'',''high'',''urgent'') DEFAULT ''medium''');
CALL add_column_if_missing('activities', 'estimated_hours_new', 'DECIMAL(10,2) DEFAULT NULL');
CALL add_column_if_missing('activities', 'actual_hours_new', 'DECIMAL(10,2) DEFAULT 0');
CALL add_column_if_missing('activities', 'completion_percentage_new', 'DECIMAL(5,2) DEFAULT 0');
CALL add_column_if_missing('activities', 'started_at', 'DATETIME DEFAULT NULL');
CALL add_column_if_missing('activities', 'order_index', 'INT DEFAULT 0');
CALL add_column_if_missing('activities', 'acceptedAt', 'DATETIME DEFAULT NULL');
CALL add_column_if_missing('activities', 'rejectedAt', 'DATETIME DEFAULT NULL');
CALL add_column_if_missing('activities', 'submittedAt', 'DATETIME DEFAULT NULL');
CALL add_column_if_missing('activities', 'reviewedAt', 'DATETIME DEFAULT NULL');
CALL add_column_if_missing('activities', 'completedAt', 'DATETIME DEFAULT NULL');
CALL add_column_if_missing('activities', 'rejectionReason', 'TEXT');
CALL add_column_if_missing('activities', 'reviewerComment', 'TEXT');
CALL add_column_if_missing('activities', 'needsChangesComments', 'TEXT');
CALL add_column_if_missing('activities', 'completionNotes', 'TEXT');
CALL add_column_if_missing('activities', 'qualityScore', 'DECIMAL(5,2) DEFAULT 0');
CALL add_column_if_missing('activities', 'rejectionCount', 'INT DEFAULT 0');
CALL add_column_if_missing('activities', 'isOverdue', 'TINYINT(1) DEFAULT 0');
CALL add_column_if_missing('activities', 'notifiedAt', 'DATETIME DEFAULT NULL');
CALL add_column_if_missing('activities', 'schoolName', 'VARCHAR(255) DEFAULT NULL');
CALL add_column_if_missing('activities', 'branchLocation', 'VARCHAR(255) DEFAULT NULL');
CALL add_column_if_missing('activities', 'sessionsCount', 'INT DEFAULT NULL');

CALL ensure_activity_enum_columns();
CALL add_index_if_missing('activities', 'idx_activities_project_hierarchy', 'INDEX `idx_activities_project_hierarchy` (`project_id`, `hierarchy_level`)');
CALL add_index_if_missing('activities', 'idx_activities_parent', 'INDEX `idx_activities_parent` (`parent_activity_id`)');
CALL add_index_if_missing('activities', 'idx_activities_assigned_project', 'INDEX `idx_activities_assigned_project` (`assignedToId`, `project_id`)');

-- ---------------------------------------------------------------------------
-- Tool assignments table used by Manager dashboard Tools.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `tool_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `departmentId` INT NOT NULL,
  `role` ENUM('employee','teamlead','manager','admin') NOT NULL,
  `workbook` TINYINT(1) NOT NULL DEFAULT 1,
  `reportCard` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL add_column_if_missing('tool_assignments', 'departmentId', 'INT NOT NULL AFTER `id`');
CALL add_column_if_missing('tool_assignments', 'role', 'ENUM(''employee'',''teamlead'',''manager'',''admin'') NOT NULL DEFAULT ''employee'' AFTER `departmentId`');
CALL add_column_if_missing('tool_assignments', 'workbook', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `role`');
CALL add_column_if_missing('tool_assignments', 'reportCard', 'TINYINT(1) NOT NULL DEFAULT 1 AFTER `workbook`');
CALL add_column_if_missing('tool_assignments', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_column_if_missing('tool_assignments', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL add_index_if_missing('tool_assignments', 'tool_assignments_dept_role_unique', 'UNIQUE KEY `tool_assignments_dept_role_unique` (`departmentId`, `role`)');

INSERT IGNORE INTO `tool_assignments` (`departmentId`, `role`, `workbook`, `reportCard`, `createdAt`, `updatedAt`)
SELECT d.id, roles.role, 1, 1, NOW(), NOW()
FROM `departments` d
JOIN (
  SELECT 'employee' AS role
  UNION ALL SELECT 'teamlead'
  UNION ALL SELECT 'manager'
  UNION ALL SELECT 'admin'
) roles;

-- ---------------------------------------------------------------------------
-- Header message/bell notifications
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `userId` VARCHAR(255) NOT NULL,
  `type` ENUM('message','notification') NOT NULL DEFAULT 'notification',
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT,
  `entityType` VARCHAR(50) DEFAULT NULL,
  `entityId` INT DEFAULT NULL,
  `metadata` JSON DEFAULT NULL,
  `isRead` TINYINT(1) NOT NULL DEFAULT 0,
  `readAt` DATETIME DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL add_column_if_missing('notifications', 'userId', 'VARCHAR(255) NOT NULL AFTER `id`');
CALL add_column_if_missing('notifications', 'type', 'ENUM(''message'',''notification'') NOT NULL DEFAULT ''notification'' AFTER `userId`');
CALL add_column_if_missing('notifications', 'title', 'VARCHAR(255) NOT NULL DEFAULT '''' AFTER `type`');
CALL add_column_if_missing('notifications', 'body', 'TEXT AFTER `title`');
CALL add_column_if_missing('notifications', 'entityType', 'VARCHAR(50) DEFAULT NULL AFTER `body`');
CALL add_column_if_missing('notifications', 'entityId', 'INT DEFAULT NULL AFTER `entityType`');
CALL add_column_if_missing('notifications', 'metadata', 'JSON DEFAULT NULL AFTER `entityId`');
CALL add_column_if_missing('notifications', 'isRead', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `metadata`');
CALL add_column_if_missing('notifications', 'readAt', 'DATETIME DEFAULT NULL AFTER `isRead`');
CALL add_column_if_missing('notifications', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_column_if_missing('notifications', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL add_index_if_missing('notifications', 'idx_notifications_user_read_type', 'INDEX `idx_notifications_user_read_type` (`userId`, `isRead`, `type`)');
CALL add_index_if_missing('notifications', 'idx_notifications_created', 'INDEX `idx_notifications_created` (`createdAt`)');

-- ---------------------------------------------------------------------------
-- Forgot password OTP reset flow
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `otpHash` VARCHAR(255) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `usedAt` DATETIME DEFAULT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL add_column_if_missing('password_reset_otps', 'email', 'VARCHAR(255) NOT NULL AFTER `id`');
CALL add_column_if_missing('password_reset_otps', 'otpHash', 'VARCHAR(255) NOT NULL AFTER `email`');
CALL add_column_if_missing('password_reset_otps', 'expiresAt', 'DATETIME NOT NULL AFTER `otpHash`');
CALL add_column_if_missing('password_reset_otps', 'usedAt', 'DATETIME DEFAULT NULL AFTER `expiresAt`');
CALL add_column_if_missing('password_reset_otps', 'attempts', 'INT NOT NULL DEFAULT 0 AFTER `usedAt`');
CALL add_column_if_missing('password_reset_otps', 'createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_column_if_missing('password_reset_otps', 'updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL add_index_if_missing('password_reset_otps', 'idx_password_reset_email', 'INDEX `idx_password_reset_email` (`email`)');
CALL add_index_if_missing('password_reset_otps', 'idx_password_reset_expires', 'INDEX `idx_password_reset_expires` (`expiresAt`)');

DROP PROCEDURE IF EXISTS ensure_activity_enum_columns;
DROP PROCEDURE IF EXISTS sync_pm_project_compat_columns;
DROP PROCEDURE IF EXISTS rename_activity_template_name_to_title;
DROP PROCEDURE IF EXISTS add_index_if_missing;
DROP PROCEDURE IF EXISTS add_column_if_missing;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
