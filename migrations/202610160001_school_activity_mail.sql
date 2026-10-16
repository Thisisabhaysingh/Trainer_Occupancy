CREATE TABLE IF NOT EXISTS `school_activity_mail_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `scope` VARCHAR(255) NOT NULL,
  `type` ENUM('trainer_reminder', 'school_notice') NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `delayMinutes` INT NOT NULL DEFAULT 120,
  `sendTime` VARCHAR(5) NOT NULL DEFAULT '18:00',
  `subjectTemplate` VARCHAR(500) NOT NULL,
  `bodyTemplate` TEXT NOT NULL,
  `toRecipients` JSON NOT NULL,
  `ccRecipients` JSON NOT NULL,
  `updatedBy` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_activity_mail_settings_scope_type` (`scope`, `type`)
);

CREATE TABLE IF NOT EXISTS `school_activity_mail_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `type` ENUM('trainer_reminder', 'school_notice', 'test') NOT NULL,
  `scope` VARCHAR(255) NOT NULL,
  `managerId` VARCHAR(255) NULL,
  `trainerId` VARCHAR(255) NULL,
  `schoolId` INT NULL,
  `assignmentId` INT NULL,
  `dedupeKey` VARCHAR(255) NULL,
  `toEmails` TEXT NULL,
  `ccEmails` TEXT NULL,
  `subject` VARCHAR(500) NULL,
  `status` ENUM('pending', 'sent', 'skipped', 'failed') NOT NULL DEFAULT 'pending',
  `error` TEXT NULL,
  `triggeredBy` VARCHAR(255) NOT NULL DEFAULT 'system',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `school_activity_mail_logs_dedupe` (`dedupeKey`),
  KEY `school_activity_mail_logs_scope_created` (`scope`, `createdAt`),
  KEY `school_activity_mail_logs_manager_created` (`managerId`, `createdAt`)
);

CREATE TABLE IF NOT EXISTS `school_mail_contacts` (
  `schoolId` INT NOT NULL,
  `emails` TEXT NOT NULL,
  `updatedBy` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`schoolId`)
);
