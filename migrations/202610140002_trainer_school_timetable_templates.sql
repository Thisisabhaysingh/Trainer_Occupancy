CREATE TABLE IF NOT EXISTS `trainer_school_timetable_templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `managerId` VARCHAR(255) NOT NULL,
  `trainerId` VARCHAR(255) NOT NULL,
  `schoolId` INT NOT NULL,
  `className` VARCHAR(100) NOT NULL,
  `courseId` INT NOT NULL,
  `startActivityPosition` INT NOT NULL DEFAULT 1,
  `dayOfWeek` TINYINT NOT NULL,
  `startTime` VARCHAR(5) NOT NULL,
  `endTime` VARCHAR(5) NOT NULL,
  `startWeek` DATE NOT NULL,
  `comment` TEXT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `trainer_school_timetable_manager_school` (`managerId`, `schoolId`),
  KEY `trainer_school_timetable_trainer_day` (`trainerId`, `dayOfWeek`),
  KEY `trainer_school_timetable_course` (`courseId`)
);

CREATE TABLE IF NOT EXISTS `trainer_school_rosters` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `managerId` VARCHAR(255) NOT NULL,
  `schoolId` INT NOT NULL,
  `trainerId` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trainer_school_roster_unique` (`managerId`, `schoolId`, `trainerId`),
  KEY `trainer_school_roster_school` (`schoolId`),
  KEY `trainer_school_roster_trainer` (`trainerId`)
);

ALTER TABLE `trainer_school_assignments`
  ADD COLUMN `timetableTemplateId` INT NULL,
  ADD UNIQUE KEY `trainer_school_template_week_unique` (`timetableTemplateId`, `weekStart`);
