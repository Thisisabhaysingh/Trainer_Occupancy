ALTER TABLE `trainer_school_assignments` ADD COLUMN `studentCount` INT NULL AFTER `trainerNote`;
ALTER TABLE `trainer_school_assignments` ADD COLUMN `photosLink` VARCHAR(1000) NULL AFTER `studentCount`;
