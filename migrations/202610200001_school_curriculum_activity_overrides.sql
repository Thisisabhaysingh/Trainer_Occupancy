CREATE TABLE IF NOT EXISTS `school_curriculum_activity_overrides` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `schoolId` INT NOT NULL,
  `className` VARCHAR(100) NOT NULL,
  `curriculumSessionId` INT NOT NULL,
  `status` ENUM('pending', 'done', 'not_completed', 'cancelled') NOT NULL,
  `scheduledCount` INT NULL,
  `completedCount` INT NULL,
  `remark` TEXT NULL,
  `updatedBy` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_curriculum_override_unique` (`schoolId`, `className`, `curriculumSessionId`),
  KEY `school_curriculum_override_session` (`curriculumSessionId`)
);
