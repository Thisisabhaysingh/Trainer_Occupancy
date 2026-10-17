-- Courses are shared across the organisation; schoolId is kept only as legacy import info.
ALTER TABLE `school_curriculum_courses` MODIFY COLUMN `schoolId` INT NULL;
ALTER TABLE `school_curriculum_courses` DROP INDEX `school_curriculum_course_unique`;
ALTER TABLE `school_curriculum_courses` ADD UNIQUE KEY `school_curriculum_course_common_unique` (`academicYear`, `term`, `gradeBand`, `courseName`);

-- Schools and trainers the admin assigns to each manager.
CREATE TABLE IF NOT EXISTS `manager_school_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `managerId` VARCHAR(255) NOT NULL,
  `schoolId` INT NOT NULL,
  `assignedBy` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `manager_school_assignment_unique` (`managerId`, `schoolId`),
  KEY `manager_school_assignment_school` (`schoolId`)
);
CREATE TABLE IF NOT EXISTS `manager_trainer_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `managerId` VARCHAR(255) NOT NULL,
  `trainerId` VARCHAR(255) NOT NULL,
  `assignedBy` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `manager_trainer_assignment_unique` (`managerId`, `trainerId`),
  KEY `manager_trainer_assignment_trainer` (`trainerId`)
);
