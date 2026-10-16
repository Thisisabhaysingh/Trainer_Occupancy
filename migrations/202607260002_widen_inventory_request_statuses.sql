-- Workflow status names are descriptive and may exceed 30 characters.
ALTER TABLE `inventory_requests`
  MODIFY `requestStatus` VARCHAR(64) NOT NULL DEFAULT 'SUBMITTED',
  MODIFY `procurementStatus` VARCHAR(64) NOT NULL DEFAULT 'NOT_REQUIRED',
  MODIFY `allocationStatus` VARCHAR(64) NOT NULL DEFAULT 'PENDING';
