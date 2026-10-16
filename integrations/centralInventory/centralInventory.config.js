const DEFAULT_BASE_URL = "http://localhost:4000/v1/integrations/timesheet/inventory";

const parseJsonMap = (value, fallback = {}) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (_error) {
    return fallback;
  }
};

const parseHostList = (value) => String(value || "")
  .split(",")
  .map((host) => host.trim().toLowerCase())
  .filter(Boolean);

const getCentralInventoryConfig = () => ({
  enabled: process.env.CENTRAL_INVENTORY_ENABLED === "true",
  readOnly: process.env.CENTRAL_INVENTORY_READ_ONLY !== "false",
  baseUrl: String(process.env.CENTRAL_INVENTORY_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
  clientId: process.env.CENTRAL_INVENTORY_CLIENT_ID || "",
  clientSecret: process.env.CENTRAL_INVENTORY_CLIENT_SECRET || "",
  token: process.env.CENTRAL_INVENTORY_JWT || "", // legacy migration fallback
  tokenUrl: String(process.env.CENTRAL_INVENTORY_TOKEN_URL || "").trim(),
  timeoutMs: Number(process.env.CENTRAL_INVENTORY_TIMEOUT_MS || 15000),
  branchMap: parseJsonMap(process.env.CENTRAL_INVENTORY_BRANCH_MAP),
  imageHosts: parseHostList(process.env.CENTRAL_INVENTORY_IMAGE_HOSTS),
  externalSystem: process.env.CENTRAL_INVENTORY_EXTERNAL_SYSTEM || "mis",
});

const centralInventoryStatus = () => {
  const config = getCentralInventoryConfig();
  return {
    enabled: config.enabled,
    readOnly: config.readOnly,
    configured: Boolean(config.baseUrl && ((config.clientId && config.clientSecret) || config.token)),
    authMode: config.clientId && config.clientSecret ? "client_credentials" : config.token ? "legacy_bearer" : "missing",
    baseUrl: config.baseUrl,
    timeoutMs: config.timeoutMs,
    externalSystem: config.externalSystem,
    mappedBranches: Object.keys(config.branchMap).length,
  };
};

module.exports = { getCentralInventoryConfig, centralInventoryStatus };
