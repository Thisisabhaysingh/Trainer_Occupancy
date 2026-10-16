-- One-time OAuth-style authorization codes for MIS-owned SSO clients.
CREATE TABLE IF NOT EXISTS sso_authorization_codes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  codeHash VARCHAR(64) NOT NULL,
  clientId VARCHAR(100) NOT NULL,
  employeeCode VARCHAR(255) NOT NULL,
  redirectUri VARCHAR(1000) NOT NULL,
  codeChallenge VARCHAR(128) NOT NULL,
  codeChallengeMethod VARCHAR(10) NOT NULL DEFAULT 'S256',
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY uq_sso_authorization_code_hash (codeHash),
  INDEX idx_sso_client_employee (clientId, employeeCode),
  INDEX idx_sso_code_expiry (expiresAt)
);
