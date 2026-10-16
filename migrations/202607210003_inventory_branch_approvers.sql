CREATE TABLE IF NOT EXISTS inventory_branch_approvers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branchId INT NOT NULL,
  employeeCode VARCHAR(255) NOT NULL,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY uq_inventory_branch_approver (branchId)
);

INSERT INTO inventory_branch_approvers (branchId, employeeCode, isActive, createdAt, updatedAt)
VALUES (8, 'OMO00330', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE employeeCode = VALUES(employeeCode), isActive = TRUE, updatedAt = NOW();
