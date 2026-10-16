-- Templates-only safe patch for Project Management > Create Template.
-- This does not remove or update existing business data.
-- Run this against the MIS database if /api/templates returns 500 because
-- the templates table or columns are missing.

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_template_column_if_missing $$
CREATE PROCEDURE add_template_column_if_missing(
  IN p_column VARCHAR(64),
  IN p_definition TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'templates'
      AND COLUMN_NAME = p_column
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `templates` ADD COLUMN `', p_column, '` ', p_definition);
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

CREATE TABLE IF NOT EXISTS `templates` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `category` VARCHAR(255) DEFAULT NULL,
  `difficulty` ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  `jobs` JSON DEFAULT NULL,
  `createdById` VARCHAR(255) DEFAULT NULL,
  `updatedById` VARCHAR(255) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CALL add_template_column_if_missing('name', 'VARCHAR(255) NOT NULL DEFAULT '''' AFTER `id`');
CALL add_template_column_if_missing('description', 'TEXT AFTER `name`');
CALL add_template_column_if_missing('category', 'VARCHAR(255) DEFAULT NULL AFTER `description`');
CALL add_template_column_if_missing('difficulty', 'ENUM(''Low'',''Medium'',''High'') NOT NULL DEFAULT ''Medium'' AFTER `category`');
CALL add_template_column_if_missing('jobs', 'JSON DEFAULT NULL AFTER `difficulty`');
CALL add_template_column_if_missing('createdById', 'VARCHAR(255) DEFAULT NULL AFTER `jobs`');
CALL add_template_column_if_missing('updatedById', 'VARCHAR(255) DEFAULT NULL AFTER `createdById`');
CALL add_template_column_if_missing('createdAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP');
CALL add_template_column_if_missing('updatedAt', 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

DROP PROCEDURE IF EXISTS add_template_column_if_missing;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
