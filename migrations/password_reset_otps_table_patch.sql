-- Safe patch for forgot-password OTP reset flow.
-- This does not remove or update existing business data.

CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `otpHash` VARCHAR(255) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `usedAt` DATETIME DEFAULT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_password_reset_email` (`email`),
  KEY `idx_password_reset_expires` (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
