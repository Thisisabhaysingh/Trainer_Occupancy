-- Apply before assigning the senior_manager role when automatic schema sync is disabled.
ALTER TABLE `Users`
  MODIFY COLUMN `role` ENUM('admin', 'manager', 'senior_manager', 'teamlead', 'employee', 'inventory_admin') NOT NULL;
