CREATE TABLE IF NOT EXISTS `trainer_activity_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `managerId` VARCHAR(255) NOT NULL,
  `trainerId` VARCHAR(255) NOT NULL,
  `activityTemplateId` VARCHAR(255) DEFAULT NULL,
  `activityTitle` VARCHAR(255) NOT NULL,
  `weekStart` DATE NOT NULL,
  `date` DATE NOT NULL,
  `startTime` VARCHAR(5) NOT NULL,
  `endTime` VARCHAR(5) NOT NULL,
  `comment` TEXT DEFAULT NULL,
  `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `trainer_activity_assignments_trainer_date` (`trainerId`, `date`),
  KEY `trainer_activity_assignments_manager_week` (`managerId`, `weekStart`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;