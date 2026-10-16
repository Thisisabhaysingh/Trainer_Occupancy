ALTER TABLE inventory_request_groups
  ADD COLUMN categoryId INT NULL AFTER inventoryItemId,
  ADD COLUMN groupingScope ENUM('ROOT','BRANCH') NOT NULL DEFAULT 'ROOT' AFTER branchId;

CREATE INDEX idx_inventory_group_root_match
  ON inventory_request_groups (normalizedItemKey, categoryId, groupingScope, groupStatus);
