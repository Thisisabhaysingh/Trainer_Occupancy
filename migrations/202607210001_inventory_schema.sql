-- Phase 6 inventory schema. Apply explicitly; never through sequelize.sync({ alter: true }).
CREATE TABLE IF NOT EXISTS inventory_categories (id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(64) NOT NULL UNIQUE, name VARCHAR(255) NOT NULL, parentId INT NULL, isActive BOOLEAN NOT NULL DEFAULT TRUE, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_category_parent(parentId));

INSERT IGNORE INTO inventory_categories (code, name, parentId, isActive, createdAt, updatedAt) VALUES
('SCHOOL_INVENTORY', 'School Inventory', NULL, TRUE, NOW(), NOW()),
('STEM_LAB', 'STEM Lab', NULL, TRUE, NOW(), NOW()),
('TAKE_AWAY_KIT', 'Take Away Kit', NULL, TRUE, NOW(), NOW()),
('COMPETITION', 'Competition', NULL, TRUE, NOW(), NOW()),
('PTM', 'PTM', NULL, TRUE, NOW(), NOW()),
('SCHOOL_EVENT', 'School Event', NULL, TRUE, NOW(), NOW()),
('DEMO', 'Demo', NULL, TRUE, NOW(), NOW()),
('PROMOTIONAL_EVENT', 'Promotional Event', NULL, TRUE, NOW(), NOW()),
('RESEARCH_PROJECT', 'Research Project', NULL, TRUE, NOW(), NOW()),
('GENERAL_INTERNAL', 'General Internal', NULL, TRUE, NOW(), NOW());

INSERT IGNORE INTO inventory_categories (code, name, parentId, isActive, createdAt, updatedAt)
SELECT child.code, child.name, parent.id, TRUE, NOW(), NOW()
FROM inventory_categories parent
JOIN (
  SELECT 'WSRO' code, 'WSRO' name UNION ALL
  SELECT 'WRO', 'WRO' UNION ALL
  SELECT 'FTC', 'FTC' UNION ALL
  SELECT 'CODEAVOUR', 'Codeavour' UNION ALL
  SELECT 'OTHER', 'Other'
) child
WHERE parent.code = 'COMPETITION';
CREATE TABLE IF NOT EXISTS inventory_items (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, description TEXT NULL, categoryId INT NOT NULL, itemType ENUM('asset','bulk','consumable','kit') NOT NULL, sku VARCHAR(100) NULL UNIQUE, defaultUnit VARCHAR(30) NOT NULL DEFAULT 'unit', isReturnable BOOLEAN NOT NULL DEFAULT TRUE, mediaId VARCHAR(255) NULL, isActive BOOLEAN NOT NULL DEFAULT TRUE, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_item_category(categoryId), CONSTRAINT fk_inventory_item_category FOREIGN KEY(categoryId) REFERENCES inventory_categories(id));

INSERT IGNORE INTO inventory_items (name, description, categoryId, itemType, sku, defaultUnit, isReturnable, isActive, createdAt, updatedAt)
SELECT seed.name, seed.description, category.id, seed.itemType, seed.sku, seed.defaultUnit, seed.isReturnable, TRUE, NOW(), NOW()
FROM inventory_categories category
JOIN (
  SELECT 'Raspberry Pi 4 Model B' name, 'Single-board computer for STEM and robotics projects' description, 'asset' itemType, 'RPI-4B' sku, 'unit' defaultUnit, TRUE isReturnable UNION ALL
  SELECT 'Arduino Uno R3', 'Microcontroller development board', 'asset', 'ARD-UNO-R3', 'unit', TRUE UNION ALL
  SELECT '5mm LED Assortment', 'Assorted-color light-emitting diodes', 'consumable', 'LED-5MM-MIX', 'pack', FALSE UNION ALL
  SELECT 'MG996R Servo Motor', 'High-torque metal-gear servo motor', 'asset', 'SRV-MG996R', 'unit', TRUE UNION ALL
  SELECT 'HC-SR04 Ultrasonic Sensor', 'Ultrasonic distance measurement sensor', 'asset', 'SNS-HCSR04', 'unit', TRUE
) seed
WHERE category.code = 'STEM_LAB';
CREATE TABLE IF NOT EXISTS inventory_stock (id INT AUTO_INCREMENT PRIMARY KEY, inventoryItemId INT NOT NULL, branchId INT NOT NULL, availableQuantity DECIMAL(12,2) NOT NULL DEFAULT 0, reservedQuantity DECIMAL(12,2) NOT NULL DEFAULT 0, allocatedQuantity DECIMAL(12,2) NOT NULL DEFAULT 0, damagedQuantity DECIMAL(12,2) NOT NULL DEFAULT 0, inTransitQuantity DECIMAL(12,2) NOT NULL DEFAULT 0, reorderLevel DECIMAL(12,2) NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, UNIQUE KEY uq_inventory_stock_item_branch(inventoryItemId,branchId));

INSERT IGNORE INTO inventory_stock (inventoryItemId, branchId, availableQuantity, reservedQuantity, allocatedQuantity, damagedQuantity, inTransitQuantity, reorderLevel, createdAt, updatedAt)
SELECT item.id, seed.branchId, seed.availableQuantity, seed.reservedQuantity, seed.allocatedQuantity, seed.damagedQuantity, seed.inTransitQuantity, seed.reorderLevel, NOW(), NOW()
FROM inventory_items item
JOIN (
  SELECT 'RPI-4B' sku, 1 branchId, 12 availableQuantity, 2 reservedQuantity, 4 allocatedQuantity, 1 damagedQuantity, 0 inTransitQuantity, 3 reorderLevel UNION ALL
  SELECT 'RPI-4B', 5, 1, 0, 1, 0, 2, 1 UNION ALL
  SELECT 'RPI-4B', 8, 2, 1, 1, 0, 0, 1 UNION ALL
  SELECT 'ARD-UNO-R3', 1, 25, 3, 8, 1, 5, 5 UNION ALL
  SELECT 'ARD-UNO-R3', 5, 4, 1, 3, 0, 2, 2 UNION ALL
  SELECT 'ARD-UNO-R3', 8, 5, 1, 2, 0, 0, 2 UNION ALL
  SELECT 'LED-5MM-MIX', 1, 200, 20, 45, 5, 50, 40 UNION ALL
  SELECT 'LED-5MM-MIX', 5, 30, 5, 10, 2, 20, 10 UNION ALL
  SELECT 'LED-5MM-MIX', 8, 40, 5, 12, 1, 0, 10 UNION ALL
  SELECT 'SRV-MG996R', 1, 18, 2, 6, 1, 4, 4 UNION ALL
  SELECT 'SRV-MG996R', 5, 3, 1, 2, 0, 2, 2 UNION ALL
  SELECT 'SRV-MG996R', 8, 4, 0, 2, 1, 0, 2 UNION ALL
  SELECT 'SNS-HCSR04', 1, 30, 4, 10, 2, 5, 6 UNION ALL
  SELECT 'SNS-HCSR04', 5, 6, 1, 3, 0, 2, 2 UNION ALL
  SELECT 'SNS-HCSR04', 8, 8, 1, 4, 0, 0, 3
) seed ON seed.sku = item.sku;
CREATE TABLE IF NOT EXISTS inventory_serial_numbers (id INT AUTO_INCREMENT PRIMARY KEY, inventoryItemId INT NOT NULL, branchId INT NOT NULL, serialNumber VARCHAR(120) NOT NULL UNIQUE, status ENUM('available','reserved','allocated','damaged','in_transit','retired') NOT NULL DEFAULT 'available', allocationId INT NULL, notes TEXT NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_serial_item_branch(inventoryItemId,branchId), CONSTRAINT fk_inventory_serial_item FOREIGN KEY(inventoryItemId) REFERENCES inventory_items(id));
CREATE TABLE IF NOT EXISTS inventory_requests (id INT AUTO_INCREMENT PRIMARY KEY, requestManifest VARCHAR(80) NOT NULL UNIQUE, platformCode VARCHAR(30) NOT NULL DEFAULT 'MIS', requesterEmployeeCode VARCHAR(255) NOT NULL, branchId INT NOT NULL, departmentId INT NULL, categoryId INT NOT NULL, subcategoryCode VARCHAR(64) NULL, contextType VARCHAR(64) NOT NULL DEFAULT 'EMPLOYEE_REQUEST', contextId VARCHAR(100) NULL, contextName VARCHAR(255) NULL, purpose TEXT NOT NULL, requiredFrom DATE NULL, expectedReturnDate DATE NULL, priority ENUM('low','normal','high','urgent') NOT NULL DEFAULT 'normal', estimatedValue DECIMAL(14,2) NOT NULL DEFAULT 0, requestStatus VARCHAR(64) NOT NULL DEFAULT 'SUBMITTED', procurementStatus VARCHAR(64) NOT NULL DEFAULT 'NOT_REQUIRED', allocationStatus VARCHAR(64) NOT NULL DEFAULT 'PENDING', createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_request_requester(requesterEmployeeCode), INDEX idx_inventory_request_status(requestStatus));
CREATE TABLE IF NOT EXISTS inventory_request_items (id INT AUTO_INCREMENT PRIMARY KEY, requestId INT NOT NULL, inventoryItemId INT NULL, requestedItemName VARCHAR(255) NOT NULL, normalizedItemKey VARCHAR(255) NOT NULL, itemType VARCHAR(30) NOT NULL, quantity DECIMAL(12,2) NOT NULL, unit VARCHAR(30) NOT NULL, referenceUrl TEXT NULL, mediaId VARCHAR(255) NULL, estimatedPrice DECIMAL(14,2) NULL, notes TEXT NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_request_item_request(requestId), INDEX idx_inventory_request_item_key(normalizedItemKey));
CREATE TABLE IF NOT EXISTS inventory_approvals (id INT AUTO_INCREMENT PRIMARY KEY, requestId INT NOT NULL, level INT NOT NULL DEFAULT 1, approverEmployeeCode VARCHAR(255) NULL, status VARCHAR(30) NOT NULL DEFAULT 'PENDING', reason TEXT NULL, actedAt DATETIME NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_approval_pending(status,approverEmployeeCode));
CREATE TABLE IF NOT EXISTS inventory_request_groups (id INT AUTO_INCREMENT PRIMARY KEY, groupManifest VARCHAR(80) NOT NULL UNIQUE, normalizedItemKey VARCHAR(255) NOT NULL, inventoryItemId INT NULL, branchId INT NOT NULL, requiredDateWindow DATE NULL, totalRequestedQuantity DECIMAL(12,2) NOT NULL DEFAULT 0, requestCount INT NOT NULL DEFAULT 0, groupStatus VARCHAR(30) NOT NULL DEFAULT 'OPEN', createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_group_match(normalizedItemKey,branchId,groupStatus));
CREATE TABLE IF NOT EXISTS inventory_request_group_members (id INT AUTO_INCREMENT PRIMARY KEY, groupId INT NOT NULL, requestId INT NOT NULL, requestItemId INT NOT NULL, quantity DECIMAL(12,2) NOT NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, UNIQUE KEY uq_inventory_group_item(groupId,requestItemId));
CREATE TABLE IF NOT EXISTS inventory_vendors (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) NULL, phone VARCHAR(80) NULL, categoryCode VARCHAR(64) NULL, isActive BOOLEAN NOT NULL DEFAULT TRUE, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL);
CREATE TABLE IF NOT EXISTS inventory_vendor_item_history (id INT AUTO_INCREMENT PRIMARY KEY, vendorId INT NOT NULL, inventoryItemId INT NULL, normalizedItemKey VARCHAR(255) NULL, branchId INT NULL, unitPrice DECIMAL(14,2) NULL, quantity DECIMAL(12,2) NULL, orderDate DATETIME NULL, deliveryDate DATETIME NULL, promisedDeliveryDate DATETIME NULL, qualityRating DECIMAL(3,2) NULL, deliveryRating DECIMAL(3,2) NULL, orderStatus VARCHAR(30) NULL, purchaseOrderId INT NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_vendor_history_item(inventoryItemId,vendorId));
CREATE TABLE IF NOT EXISTS inventory_purchase_orders (id INT AUTO_INCREMENT PRIMARY KEY, orderManifest VARCHAR(80) NOT NULL UNIQUE, vendorId INT NOT NULL, requestGroupId INT NULL, branchId INT NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'PLACED', totalAmount DECIMAL(14,2) NULL, expectedDeliveryDate DATE NULL, receivedAt DATETIME NULL, createdBy VARCHAR(255) NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL);
CREATE TABLE IF NOT EXISTS inventory_purchase_order_items (id INT AUTO_INCREMENT PRIMARY KEY, purchaseOrderId INT NOT NULL, inventoryItemId INT NOT NULL, quantity DECIMAL(12,2) NOT NULL, unitPrice DECIMAL(14,2) NOT NULL, receivedQuantity DECIMAL(12,2) NOT NULL DEFAULT 0, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_po_item_order(purchaseOrderId));
CREATE TABLE IF NOT EXISTS inventory_allocations (id INT AUTO_INCREMENT PRIMARY KEY, requestId INT NOT NULL, requestItemId INT NOT NULL, inventoryItemId INT NULL, allocatedToEmployeeCode VARCHAR(255) NOT NULL, branchId INT NOT NULL, quantity DECIMAL(12,2) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'ALLOCATED', allocatedBy VARCHAR(255) NULL, allocatedAt DATETIME NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_allocation_employee(allocatedToEmployeeCode,status));
CREATE TABLE IF NOT EXISTS inventory_returns (id INT AUTO_INCREMENT PRIMARY KEY, allocationId INT NOT NULL, requestedBy VARCHAR(255) NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'PENDING', `condition` ENUM('good','damaged','consumed','lost') NULL, notes TEXT NULL, inspectedBy VARCHAR(255) NULL, inspectedAt DATETIME NULL, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL, INDEX idx_inventory_return_status(status));

INSERT IGNORE INTO inventory_categories(code,name,createdAt,updatedAt) VALUES
('SCHOOL_INVENTORY','School Inventory',NOW(),NOW()),('STEM_LAB','STEM Lab Inventory',NOW(),NOW()),('TAKE_AWAY_KIT','Take Away Kits',NOW(),NOW()),('COMPETITION','Competition',NOW(),NOW()),('PTM','Parent–Teacher Meeting',NOW(),NOW()),('SCHOOL_EVENT','School Event',NOW(),NOW()),('DEMO','Demo',NOW(),NOW()),('PROMOTIONAL_EVENT','Promotional Event',NOW(),NOW()),('RESEARCH_PROJECT','Research Project',NOW(),NOW()),('GENERAL_INTERNAL','General/Internal',NOW(),NOW());
