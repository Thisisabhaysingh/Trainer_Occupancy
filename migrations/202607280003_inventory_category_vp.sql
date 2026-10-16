-- Separate organisational Department VP access from category-based inventory approval.
ALTER TABLE inventory_responsibilities
  MODIFY responsibilityType ENUM('DEPARTMENT_VP','CATEGORY_VP','INVENTORY_HEAD') NOT NULL;

-- Preserve the intended Research Project routing by assigning it to the
-- currently configured Research and Innovation Department VP.
INSERT INTO inventory_responsibilities
  (responsibilityType, employeeCode, departmentId, categoryId, isActive, createdAt, updatedAt)
SELECT
  'CATEGORY_VP',
  department_vp.employeeCode,
  department_vp.departmentId,
  category.id,
  TRUE,
  NOW(),
  NOW()
FROM inventory_categories category
JOIN departments department ON department.name = 'Research and Innovation'
JOIN inventory_responsibilities department_vp
  ON department_vp.responsibilityType = 'DEPARTMENT_VP'
  AND department_vp.departmentId = department.id
  AND department_vp.isActive = TRUE
WHERE category.code = 'RESEARCH_PROJECT'
ON DUPLICATE KEY UPDATE
  employeeCode = VALUES(employeeCode),
  departmentId = VALUES(departmentId),
  isActive = TRUE,
  updatedAt = NOW();
