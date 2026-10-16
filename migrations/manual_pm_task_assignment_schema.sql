-- Project/job/task assignment schema for the PM module.
-- Review before running. This file is not executed automatically.

CREATE TABLE IF NOT EXISTS `pm_priority_definitions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `color` varchar(7) DEFAULT '#007bff',
  `level` int DEFAULT 0,
  `applies_to` enum('project','task','job','all') DEFAULT 'all',
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_priority_definitions_name_unique` (`name`)
);

CREATE TABLE IF NOT EXISTS `pm_status_definitions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `color` varchar(7) DEFAULT '#6c757d',
  `category` enum('not_started','in_progress','review','completed','closed','on_hold','cancelled') DEFAULT 'not_started',
  `is_active` tinyint(1) DEFAULT 1,
  `sort_order` int DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pm_status_definitions_name_unique` (`name`)
);

CREATE TABLE IF NOT EXISTS `pm_projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `description` text,
  `departmentId` int DEFAULT NULL,
  `branchId` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `project_manager` varchar(255) DEFAULT NULL,
  `priority_id` int DEFAULT NULL,
  `status_id` int DEFAULT NULL,
  `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  `status` enum('planning','active','on_hold','completed','cancelled') DEFAULT 'planning',
  `progress` decimal(5,2) DEFAULT 0,
  `created_by` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `pm_project_members` (
  `project_id` int NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `role` enum('owner','manager','member','viewer') DEFAULT 'member',
  `joined_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`project_id`,`user_id`)
);

CREATE TABLE IF NOT EXISTS `pm_deadline_extensions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `entity_type` enum('project','activity','task') NOT NULL,
  `entity_id` int NOT NULL,
  `old_deadline` date DEFAULT NULL,
  `new_deadline` date NOT NULL,
  `reason` text,
  `requested_by` varchar(255) DEFAULT NULL,
  `requested_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `approved_by` varchar(255) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `pm_clone_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_project_id` int DEFAULT NULL,
  `cloned_project_id` int DEFAULT NULL,
  `cloned_by` varchar(255) DEFAULT NULL,
  `cloned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

ALTER TABLE `activities`
  MODIFY `status` enum('pending','accepted','in-progress','submitted','needs_changes','approved','completed','rejected','cancelled','deleted') DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS `project_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `hierarchy_level` enum('project','job','task','subtask') DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `parent_activity_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `job_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `dueDate` date DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `priority_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `status_id` int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `priority` enum('low','medium','high','urgent') DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS `estimated_hours_new` decimal(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `actual_hours_new` decimal(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `completion_percentage_new` decimal(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `started_at` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `order_index` int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `acceptedAt` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rejectedAt` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `submittedAt` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `reviewedAt` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `completedAt` datetime DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rejectionReason` text,
  ADD COLUMN IF NOT EXISTS `reviewerComment` text,
  ADD COLUMN IF NOT EXISTS `needsChangesComments` text,
  ADD COLUMN IF NOT EXISTS `completionNotes` text,
  ADD COLUMN IF NOT EXISTS `qualityScore` decimal(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `rejectionCount` int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `isOverdue` tinyint(1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `notifiedAt` datetime DEFAULT NULL;

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
