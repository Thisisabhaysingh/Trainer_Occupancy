CREATE TABLE IF NOT EXISTS inventory_settings (
  settingKey VARCHAR(80) PRIMARY KEY,
  settingValue VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_responsibilities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  responsibilityType ENUM('DEPARTMENT_VP','INVENTORY_HEAD') NOT NULL,
  employeeCode VARCHAR(255) NOT NULL,
  departmentId INT NULL,
  isActive BOOLEAN NOT NULL DEFAULT TRUE,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY uq_inventory_responsibility (responsibilityType, departmentId)
);

CREATE TABLE IF NOT EXISTS inventory_fulfilment_decisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requestId INT NOT NULL,
  requestItemId INT NOT NULL,
  sourceType ENUM('LOCAL_STOCK','HQ_TRANSFER','PROCUREMENT') NOT NULL,
  sourceBranchId INT NULL,
  localAvailableQuantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  hqAvailableQuantity DECIMAL(12,2) NOT NULL DEFAULT 0,
  economicStatus ENUM('NOT_ASSESSED','ECONOMICAL','NOT_ECONOMICAL') NOT NULL DEFAULT 'NOT_ASSESSED',
  reason TEXT NULL,
  decidedBy VARCHAR(255) NULL,
  decidedAt DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY uq_inventory_fulfilment_item (requestItemId)
);

CREATE TABLE IF NOT EXISTS inventory_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transferManifest VARCHAR(80) NOT NULL UNIQUE,
  requestId INT NULL,
  requestItemId INT NULL,
  inventoryItemId INT NOT NULL,
  fromBranchId INT NOT NULL,
  toBranchId INT NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  status ENUM('DRAFT','APPROVED','DISPATCHED','IN_TRANSIT','DELIVERED','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  approvedBy VARCHAR(255) NULL,
  dispatchedAt DATETIME NULL,
  deliveredAt DATETIME NULL,
  createdBy VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_shipments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shipmentManifest VARCHAR(80) NOT NULL UNIQUE,
  transferId INT NULL,
  purchaseOrderId INT NULL,
  courierName VARCHAR(160) NOT NULL,
  trackingNumber VARCHAR(160) NOT NULL,
  trackingUrl TEXT NULL,
  status ENUM('BOOKED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','EXCEPTION','CANCELLED') NOT NULL DEFAULT 'BOOKED',
  shippedAt DATETIME NULL,
  expectedDeliveryDate DATE NULL,
  deliveredAt DATETIME NULL,
  notes TEXT NULL,
  createdBy VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY uq_inventory_courier_tracking (courierName, trackingNumber),
  INDEX idx_inventory_shipment_transfer (transferId),
  INDEX idx_inventory_shipment_order (purchaseOrderId)
);

INSERT INTO inventory_settings (settingKey, settingValue, description, createdAt, updatedAt)
VALUES ('HQ_BRANCH_ID', '1', 'Mumbai Head Office branch used as the central inventory source', NOW(), NOW())
ON DUPLICATE KEY UPDATE description = VALUES(description), updatedAt = NOW();

INSERT INTO inventory_responsibilities (responsibilityType, employeeCode, departmentId, isActive, createdAt, updatedAt)
VALUES ('INVENTORY_HEAD', 'OMO00063', NULL, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE employeeCode = VALUES(employeeCode), isActive = TRUE, updatedAt = NOW();
