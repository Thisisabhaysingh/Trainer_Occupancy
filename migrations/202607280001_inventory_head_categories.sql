ALTER TABLE inventory_responsibilities
  ADD COLUMN categoryId INT NULL AFTER departmentId;

ALTER TABLE inventory_responsibilities
  DROP INDEX uq_inventory_responsibility,
  ADD UNIQUE KEY uq_inventory_head_category (responsibilityType, categoryId),
  ADD INDEX idx_inventory_responsibility_department (responsibilityType, departmentId),
  ADD CONSTRAINT fk_inventory_responsibility_category
    FOREIGN KEY (categoryId) REFERENCES inventory_categories(id);

-- Preserve current behaviour by initially assigning every active category to the
-- previously configured global Inventory Head. Admin can then redistribute them.
INSERT INTO inventory_responsibilities
  (responsibilityType, employeeCode, departmentId, categoryId, isActive, createdAt, updatedAt)
SELECT
  'INVENTORY_HEAD', global_head.employeeCode, NULL, category.id, TRUE, NOW(), NOW()
FROM inventory_categories category
JOIN (
  SELECT employeeCode
  FROM inventory_responsibilities
  WHERE responsibilityType = 'INVENTORY_HEAD' AND categoryId IS NULL AND isActive = TRUE
  ORDER BY updatedAt DESC
  LIMIT 1
) global_head
WHERE category.isActive = TRUE
ON DUPLICATE KEY UPDATE
  employeeCode = VALUES(employeeCode),
  isActive = TRUE,
  updatedAt = NOW();

UPDATE inventory_responsibilities
SET isActive = FALSE, updatedAt = NOW()
WHERE responsibilityType = 'INVENTORY_HEAD' AND categoryId IS NULL;
