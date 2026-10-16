ALTER TABLE `trainer_school_assignments`
  MODIFY COLUMN `completionStatus` ENUM('pending', 'completed', 'not_completed', 'cancelled') NOT NULL DEFAULT 'pending';
