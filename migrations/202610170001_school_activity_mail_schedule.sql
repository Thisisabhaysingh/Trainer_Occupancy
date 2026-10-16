ALTER TABLE `school_activity_mail_settings` ADD COLUMN `lookbackDays` INT NOT NULL DEFAULT 1 AFTER `sendTime`;
ALTER TABLE `school_activity_mail_logs` ADD COLUMN `bodyHtml` MEDIUMTEXT NULL AFTER `subject`;
ALTER TABLE `school_activity_mail_logs` ADD COLUMN `details` JSON NULL AFTER `bodyHtml`;
ALTER TABLE `school_activity_mail_logs` ADD COLUMN `sentAt` DATETIME NULL AFTER `error`;
