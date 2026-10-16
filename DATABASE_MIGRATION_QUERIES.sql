-- =====================================================
-- DATABASE MIGRATION QUERIES FOR BRANCH-WISE CATEGORIZATION
-- WITH TEAM LEAD (TL) ROLE IMPLEMENTATION
-- =====================================================
-- Run these queries in your cloud MySQL database
-- Make sure to backup your database before running these queries
-- =====================================================

-- Step 1: Add 'teamlead' to the role ENUM in users table
-- Note: MySQL requires recreating the ENUM with all values
ALTER TABLE `users` 
MODIFY COLUMN `role` ENUM('admin', 'manager', 'teamlead', 'employee') NOT NULL;

-- Step 2: Add branchId column to users table
ALTER TABLE `users` 
ADD COLUMN `branchId` INT NULL AFTER `departmentId`,
ADD INDEX `idx_users_branchId` (`branchId`);

-- Step 3: Add foreign key constraint for branchId in users table
ALTER TABLE `users`
ADD CONSTRAINT `fk_users_branchId` 
FOREIGN KEY (`branchId`) REFERENCES `Branches`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 4: Add branchId column to departments table
ALTER TABLE `departments` 
ADD COLUMN `branchId` INT NULL AFTER `location`,
ADD INDEX `idx_departments_branchId` (`branchId`);

-- Step 5: Add teamLeadId column to departments table
ALTER TABLE `departments` 
ADD COLUMN `teamLeadId` VARCHAR(255) NULL AFTER `branchId`,
ADD INDEX `idx_departments_teamLeadId` (`teamLeadId`);

-- Step 6: Add foreign key constraint for branchId in departments table
ALTER TABLE `departments`
ADD CONSTRAINT `fk_departments_branchId` 
FOREIGN KEY (`branchId`) REFERENCES `Branches`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 7: Add foreign key constraint for teamLeadId in departments table
ALTER TABLE `departments`
ADD CONSTRAINT `fk_departments_teamLeadId` 
FOREIGN KEY (`teamLeadId`) REFERENCES `users`(`employeeCode`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Add foreign key constraint for managerId in departments table (if not exists)
-- Check if this constraint already exists before running
ALTER TABLE `departments`
ADD CONSTRAINT `fk_departments_managerId` 
FOREIGN KEY (`managerId`) REFERENCES `users`(`employeeCode`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================
-- OPTIONAL: Sample data insertion for testing
-- =====================================================

-- Create sample branches (if not exists)
-- INSERT INTO `Branches` (`name`, `location`, `createdAt`, `updatedAt`) 
-- VALUES 
--   ('Mumbai Branch', 'Mumbai, Maharashtra', NOW(), NOW()),
--   ('Delhi Branch', 'Delhi, NCR', NOW(), NOW()),
--   ('Bangalore Branch', 'Bangalore, Karnataka', NOW(), NOW());

-- Update existing departments to assign them to branches
-- UPDATE `departments` SET `branchId` = 1 WHERE `name` = 'Coding';
-- UPDATE `departments` SET `branchId` = 1 WHERE `name` = 'Mechatronics';
-- UPDATE `departments` SET `branchId` = 2 WHERE `name` = 'Electronics';

-- Create sample team lead user
-- INSERT INTO `users` (`employeeCode`, `name`, `email`, `password`, `role`, `departmentId`, `branchId`, `createdAt`, `updatedAt`)
-- VALUES ('TL001', 'Team Lead Name', 'teamlead@example.com', '$2a$10$hashedpassword', 'teamlead', 1, 1, NOW(), NOW());

-- Assign team lead to department
-- UPDATE `departments` SET `teamLeadId` = 'TL001' WHERE `id` = 1;

-- Update existing managers to assign them to branches
-- UPDATE `users` SET `branchId` = 1 WHERE `role` = 'manager' AND `employeeCode` = 'MGR001';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check users table structure
-- DESCRIBE `users`;

-- Check departments table structure
-- DESCRIBE `departments`;

-- Check all team leads
-- SELECT * FROM `users` WHERE `role` = 'teamlead';

-- Check departments with their team leads and managers
-- SELECT 
--   d.id,
--   d.name AS department_name,
--   d.branchId,
--   b.name AS branch_name,
--   tl.name AS team_lead_name,
--   m.name AS manager_name
-- FROM `departments` d
-- LEFT JOIN `Branches` b ON d.branchId = b.id
-- LEFT JOIN `users` tl ON d.teamLeadId = tl.employeeCode
-- LEFT JOIN `users` m ON d.managerId = m.employeeCode;

-- Check users by branch
-- SELECT 
--   u.employeeCode,
--   u.name,
--   u.role,
--   u.branchId,
--   b.name AS branch_name,
--   d.name AS department_name
-- FROM `users` u
-- LEFT JOIN `Branches` b ON u.branchId = b.id
-- LEFT JOIN `departments` d ON u.departmentId = d.id
-- ORDER BY u.branchId, u.role;

-- =====================================================
-- ROLLBACK QUERIES (Use only if you need to revert changes)
-- =====================================================

-- WARNING: These will remove the new columns and constraints
-- Only use if you need to rollback the migration

-- Remove foreign key constraints
-- ALTER TABLE `users` DROP FOREIGN KEY `fk_users_branchId`;
-- ALTER TABLE `departments` DROP FOREIGN KEY `fk_departments_branchId`;
-- ALTER TABLE `departments` DROP FOREIGN KEY `fk_departments_teamLeadId`;
-- ALTER TABLE `departments` DROP FOREIGN KEY `fk_departments_managerId`;

-- Remove indexes
-- ALTER TABLE `users` DROP INDEX `idx_users_branchId`;
-- ALTER TABLE `departments` DROP INDEX `idx_departments_branchId`;
-- ALTER TABLE `departments` DROP INDEX `idx_departments_teamLeadId`;

-- Remove columns
-- ALTER TABLE `users` DROP COLUMN `branchId`;
-- ALTER TABLE `departments` DROP COLUMN `branchId`;
-- ALTER TABLE `departments` DROP COLUMN `teamLeadId`;

-- Revert role ENUM (back to original)
-- ALTER TABLE `users` MODIFY COLUMN `role` ENUM('admin', 'manager', 'employee') NOT NULL;

-- =====================================================
-- END OF MIGRATION QUERIES
-- =====================================================
