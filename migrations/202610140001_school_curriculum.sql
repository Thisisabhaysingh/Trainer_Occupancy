CREATE TABLE IF NOT EXISTS `school_curriculum_courses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `schoolId` INT NOT NULL,
  `academicYear` VARCHAR(20) NOT NULL,
  `term` VARCHAR(40) NOT NULL,
  `gradeBand` VARCHAR(40) NOT NULL,
  `courseName` VARCHAR(255) NOT NULL,
  `declaredSessions` INT NOT NULL DEFAULT 0,
  `computerLab` TINYINT(1) NOT NULL DEFAULT 0,
  `sourceSheet` VARCHAR(100) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_curriculum_course_unique` (`schoolId`, `academicYear`, `term`, `gradeBand`, `courseName`),
  KEY `school_curriculum_courses_school_year` (`schoolId`, `academicYear`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `school_curriculum_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `courseId` INT NOT NULL,
  `position` INT NOT NULL,
  `sourceSessionNumber` VARCHAR(20) DEFAULT NULL,
  `topic` VARCHAR(255) DEFAULT NULL,
  `title` VARCHAR(255) NOT NULL,
  `learningOutcome` TEXT DEFAULT NULL,
  `academicConcept` TEXT DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_curriculum_session_unique` (`courseId`, `position`),
  KEY `school_curriculum_sessions_course` (`courseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET @add_curriculum_session_id = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `trainer_school_assignments` ADD COLUMN `curriculumSessionId` INT DEFAULT NULL, ADD KEY `trainer_school_assignments_curriculum_session` (`curriculumSessionId`)',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_school_assignments' AND COLUMN_NAME = 'curriculumSessionId'
);
PREPARE curriculum_stmt FROM @add_curriculum_session_id;
EXECUTE curriculum_stmt;
DEALLOCATE PREPARE curriculum_stmt;

SET @add_completion_status = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `trainer_school_assignments` ADD COLUMN `completionStatus` ENUM(''pending'',''completed'') NOT NULL DEFAULT ''pending''',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_school_assignments' AND COLUMN_NAME = 'completionStatus'
);
PREPARE curriculum_stmt FROM @add_completion_status;
EXECUTE curriculum_stmt;
DEALLOCATE PREPARE curriculum_stmt;

SET @add_completed_at = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `trainer_school_assignments` ADD COLUMN `completedAt` DATETIME DEFAULT NULL',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_school_assignments' AND COLUMN_NAME = 'completedAt'
);
PREPARE curriculum_stmt FROM @add_completed_at;
EXECUTE curriculum_stmt;
DEALLOCATE PREPARE curriculum_stmt;

SET @add_trainer_note = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `trainer_school_assignments` ADD COLUMN `trainerNote` TEXT DEFAULT NULL',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trainer_school_assignments' AND COLUMN_NAME = 'trainerNote'
);
PREPARE curriculum_stmt FROM @add_trainer_note;
EXECUTE curriculum_stmt;
DEALLOCATE PREPARE curriculum_stmt;
