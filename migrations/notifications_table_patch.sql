-- Safe patch for in-app header message/bell notifications.
-- This does not remove or update existing business data.

DELIMITER $$

DROP PROCEDURE IF EXISTS add_notification_column_if_missing $$
CREATE PROCEDURE add_notification_column_if_missing(
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notifications'
      AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `notifications` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DROP PROCEDURE IF EXISTS add_notification_index_if_missing $$
CREATE PROCEDURE add_notification_index_if_missing(
  IN p_index VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'notifications'
      AND INDEX_NAME = p_index
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `notifications` ADD ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

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
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read_type` (`userId`, `isRead`, `type`),
  KEY `idx_notifications_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL add_notification_column_if_missing('userId', 'VARCHAR(255) NOT NULL AFTER `id`');
CALL add_notification_column_if_missing('type', 'ENUM(''message'',''notification'') NOT NULL DEFAULT ''notification'' AFTER `userId`');
CALL add_notification_column_if_missing('title', 'VARCHAR(255) NOT NULL DEFAULT '''' AFTER `type`');
CALL add_notification_column_if_missing('body', 'TEXT AFTER `title`');
CALL add_notification_column_if_missing('entityType', 'VARCHAR(50) DEFAULT NULL AFTER `body`');
CALL add_notification_column_if_missing('entityId', 'INT DEFAULT NULL AFTER `entityType`');
CALL add_notification_column_if_missing('metadata', 'JSON DEFAULT NULL AFTER `entityId`');
CALL add_notification_column_if_missing('isRead', 'TINYINT(1) NOT NULL DEFAULT 0 AFTER `metadata`');
CALL add_notification_column_if_missing('readAt', 'DATETIME DEFAULT NULL AFTER `isRead`');
CALL add_notification_column_if_missing('createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_notification_column_if_missing('updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
CALL add_notification_index_if_missing('idx_notifications_user_read_type', 'INDEX `idx_notifications_user_read_type` (`userId`, `isRead`, `type`)');
CALL add_notification_index_if_missing('idx_notifications_created', 'INDEX `idx_notifications_created` (`createdAt`)');

DROP PROCEDURE IF EXISTS add_notification_index_if_missing;
DROP PROCEDURE IF EXISTS add_notification_column_if_missing;
