-- Local showcase catalog used when Central Inventory is not connected.
-- This migration is idempotent and never overwrites existing stock quantities.

INSERT IGNORE INTO inventory_items
  (name, description, categoryId, itemType, sku, defaultUnit, isReturnable, isActive, createdAt, updatedAt)
SELECT
  seed.name,
  seed.description,
  category.id,
  seed.itemType,
  seed.sku,
  seed.defaultUnit,
  seed.isReturnable,
  TRUE,
  NOW(),
  NOW()
FROM inventory_categories category
JOIN (
  SELECT 'Robotics Starter Kit' name, 'Reusable robotics kit for classroom workshops' description,
    'TAKE_AWAY_KIT' categoryCode, 'kit' itemType, 'KIT-ROBOTICS-01' sku, 'kit' defaultUnit, TRUE isReturnable
  UNION ALL
  SELECT 'Digital Multimeter', 'Portable multimeter for electronics testing',
    'STEM_LAB', 'asset', 'TOOL-DMM-01', 'unit', TRUE
  UNION ALL
  SELECT 'Science Demonstration Box', 'Reusable demonstration materials for school visits',
    'DEMO', 'kit', 'DEMO-SCIENCE-01', 'box', TRUE
  UNION ALL
  SELECT 'Competition Practice Arena', 'Modular practice arena for robotics competitions',
    'COMPETITION', 'asset', 'ARENA-COMP-01', 'set', TRUE
  UNION ALL
  SELECT 'PLA Filament 1kg', 'General-purpose filament for prototyping and research',
    'RESEARCH_PROJECT', 'consumable', 'PLA-1KG-MIX', 'spool', FALSE
  UNION ALL
  SELECT 'Safety Goggles', 'Protective eyewear for lab activities',
    'SCHOOL_INVENTORY', 'asset', 'SAFE-GOGGLE-01', 'unit', TRUE
  UNION ALL
  SELECT 'A4 Promotional Flyer Pack', 'Printed flyers for promotional events',
    'PROMOTIONAL_EVENT', 'consumable', 'FLYER-A4-100', 'pack', FALSE
) seed ON seed.categoryCode = category.code;

-- Make the original STEM showcase catalog visible to employees in Delhi.
INSERT IGNORE INTO inventory_stock
  (inventoryItemId, branchId, availableQuantity, reservedQuantity, allocatedQuantity,
   damagedQuantity, inTransitQuantity, reorderLevel, createdAt, updatedAt)
SELECT
  item.id,
  7,
  seed.availableQuantity,
  seed.reservedQuantity,
  seed.allocatedQuantity,
  seed.damagedQuantity,
  seed.inTransitQuantity,
  seed.reorderLevel,
  NOW(),
  NOW()
FROM inventory_items item
JOIN (
  SELECT 'RPI-4B' sku, 8 availableQuantity, 1 reservedQuantity, 3 allocatedQuantity,
    0 damagedQuantity, 2 inTransitQuantity, 2 reorderLevel
  UNION ALL SELECT 'ARD-UNO-R3', 18, 2, 6, 1, 4, 5
  UNION ALL SELECT 'LED-5MM-MIX', 120, 15, 30, 3, 40, 30
  UNION ALL SELECT 'SRV-MG996R', 14, 2, 4, 1, 3, 4
  UNION ALL SELECT 'SNS-HCSR04', 22, 3, 7, 0, 5, 6
) seed ON seed.sku = item.sku
JOIN Branches branch ON branch.id = 7;

-- Add cross-category showcase stock for Head Office, Delhi, and Bangalore.
INSERT IGNORE INTO inventory_stock
  (inventoryItemId, branchId, availableQuantity, reservedQuantity, allocatedQuantity,
   damagedQuantity, inTransitQuantity, reorderLevel, createdAt, updatedAt)
SELECT
  item.id,
  seed.branchId,
  seed.availableQuantity,
  seed.reservedQuantity,
  seed.allocatedQuantity,
  seed.damagedQuantity,
  seed.inTransitQuantity,
  seed.reorderLevel,
  NOW(),
  NOW()
FROM inventory_items item
JOIN (
  SELECT 'KIT-ROBOTICS-01' sku, 1 branchId, 20 availableQuantity, 3 reservedQuantity, 8 allocatedQuantity, 1 damagedQuantity, 6 inTransitQuantity, 5 reorderLevel
  UNION ALL SELECT 'KIT-ROBOTICS-01', 7, 7, 1, 4, 0, 3, 2
  UNION ALL SELECT 'KIT-ROBOTICS-01', 8, 5, 1, 2, 0, 2, 2
  UNION ALL SELECT 'TOOL-DMM-01', 1, 16, 2, 5, 1, 4, 4
  UNION ALL SELECT 'TOOL-DMM-01', 7, 6, 1, 3, 0, 2, 2
  UNION ALL SELECT 'TOOL-DMM-01', 8, 4, 0, 2, 0, 1, 2
  UNION ALL SELECT 'DEMO-SCIENCE-01', 1, 12, 2, 5, 0, 3, 3
  UNION ALL SELECT 'DEMO-SCIENCE-01', 7, 5, 1, 2, 0, 2, 2
  UNION ALL SELECT 'DEMO-SCIENCE-01', 8, 4, 1, 2, 0, 1, 2
  UNION ALL SELECT 'ARENA-COMP-01', 1, 4, 1, 2, 0, 1, 1
  UNION ALL SELECT 'ARENA-COMP-01', 7, 2, 0, 1, 0, 1, 1
  UNION ALL SELECT 'ARENA-COMP-01', 8, 2, 0, 1, 0, 0, 1
  UNION ALL SELECT 'PLA-1KG-MIX', 1, 45, 5, 12, 2, 15, 10
  UNION ALL SELECT 'PLA-1KG-MIX', 7, 18, 2, 6, 1, 8, 5
  UNION ALL SELECT 'PLA-1KG-MIX', 8, 14, 2, 5, 1, 5, 4
  UNION ALL SELECT 'SAFE-GOGGLE-01', 1, 60, 8, 20, 3, 15, 15
  UNION ALL SELECT 'SAFE-GOGGLE-01', 7, 24, 3, 10, 1, 8, 8
  UNION ALL SELECT 'SAFE-GOGGLE-01', 8, 20, 2, 8, 1, 6, 6
  UNION ALL SELECT 'FLYER-A4-100', 1, 35, 4, 10, 0, 20, 10
  UNION ALL SELECT 'FLYER-A4-100', 7, 12, 2, 4, 0, 10, 5
  UNION ALL SELECT 'FLYER-A4-100', 8, 10, 1, 3, 0, 8, 4
) seed ON seed.sku = item.sku
JOIN Branches branch ON branch.id = seed.branchId;
