-- Academic structure mirrored from omo_reportcard (sync-ready via reportcardId).
CREATE TABLE IF NOT EXISTS `school_academic_sessions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `schoolId` INT NOT NULL,
  `label` VARCHAR(50) NOT NULL,
  `startDate` DATE NOT NULL,
  `endDate` DATE NOT NULL,
  `isActive` TINYINT(1) NOT NULL DEFAULT 0,
  `reportcardId` INT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_academic_session_label_unique` (`schoolId`, `label`),
  KEY `school_academic_session_reportcard` (`reportcardId`)
);

CREATE TABLE IF NOT EXISTS `school_academic_terms` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `academicSessionId` INT NOT NULL,
  `name` VARCHAR(50) NOT NULL,
  `order` INT NOT NULL DEFAULT 1,
  `startsOn` DATE NULL,
  `endsOn` DATE NULL,
  `reportcardId` INT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_academic_term_order_unique` (`academicSessionId`, `order`),
  KEY `school_academic_term_reportcard` (`reportcardId`)
);

CREATE TABLE IF NOT EXISTS `school_classes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `schoolId` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('upcoming', 'active', 'completed') NOT NULL DEFAULT 'upcoming',
  `startDate` DATE NULL,
  `endDate` DATE NULL,
  `totalSessions` INT NOT NULL DEFAULT 0,
  `trainerId` VARCHAR(255) NULL,
  `activeAcademicSessionId` INT NULL,
  `activeAcademicTermId` INT NULL,
  `reportcardId` INT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_class_title_unique` (`schoolId`, `title`),
  KEY `school_class_trainer` (`trainerId`),
  KEY `school_class_reportcard` (`reportcardId`)
);

CREATE TABLE IF NOT EXISTS `school_class_courses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `classId` INT NOT NULL,
  `courseId` INT NOT NULL,
  `academicSessionId` INT NULL,
  `academicTermId` INT NULL,
  `assignedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assignedBy` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `school_class_course_class` (`classId`, `academicSessionId`, `academicTermId`),
  KEY `school_class_course_course` (`courseId`)
);

-- Course fields used by omo_reportcard (code is its natural sync key).
ALTER TABLE `school_curriculum_courses` ADD COLUMN `code` VARCHAR(50) NULL AFTER `id`;
ALTER TABLE `school_curriculum_courses` ADD COLUMN `description` TEXT NULL AFTER `courseName`;
ALTER TABLE `school_curriculum_courses` ADD COLUMN `durationWeeks` INT NULL AFTER `description`;
ALTER TABLE `school_curriculum_courses` ADD COLUMN `status` ENUM('active', 'archived') NOT NULL DEFAULT 'active' AFTER `durationWeeks`;
ALTER TABLE `school_curriculum_courses` ADD UNIQUE KEY `school_curriculum_course_code_unique` (`code`);
