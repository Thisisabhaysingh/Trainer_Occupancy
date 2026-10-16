INSERT IGNORE INTO inventory_categories
  (code, name, parentId, isActive, createdAt, updatedAt)
VALUES
  ('INSTITUTE_CLASS', 'Institute Class', NULL, TRUE, NOW(), NOW());
