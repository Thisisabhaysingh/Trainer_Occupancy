const axios = require("axios");
const AppError = require("../../utils/AppError");
const { getCentralInventoryConfig } = require("./centralInventory.config");

class CentralInventoryAdapter {
  constructor({ config = getCentralInventoryConfig(), transport } = {}) {
    this.config = config;
    this.transport = transport || axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeoutMs,
      headers: { Accept: "application/json" },
      maxRedirects: 0,
    });
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    this.tokenRequest = null;
  }

  assertConfigured() {
    if (!this.config.enabled) {
      throw new AppError("Central Inventory integration is disabled.", {
        statusCode: 503,
        code: "CENTRAL_INVENTORY_DISABLED",
      });
    }
    if (!(this.config.clientId && this.config.clientSecret) && !this.config.token) {
      throw new AppError("Central Inventory client credentials are not configured.", {
        statusCode: 503,
        code: "CENTRAL_INVENTORY_NOT_CONFIGURED",
      });
    }
    if (process.env.NODE_ENV === "production" && !this.config.baseUrl.startsWith("https://")) {
      throw new AppError("Central Inventory must use HTTPS in production.", {
        statusCode: 503,
        code: "CENTRAL_INVENTORY_INSECURE_URL",
      });
    }
  }

  async getAccessToken({ force = false } = {}) {
    if (!(this.config.clientId && this.config.clientSecret)) return this.config.token;
    if (!force && this.accessToken && this.accessTokenExpiresAt > Date.now() + 30000) return this.accessToken;
    if (this.tokenRequest) return this.tokenRequest;
    const tokenUrl = this.config.tokenUrl || this.config.baseUrl.replace(/\/inventory\/?$/, "/oauth/token");
    const form = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });
    this.tokenRequest = this.transport.post(tokenUrl, form.toString(), {
      timeout: this.config.timeoutMs,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }).then((response) => {
      const token = response.data?.access_token;
      const expiresIn = Number(response.data?.expires_in || 900);
      if (!token) throw new Error("Omnix token endpoint returned no access_token");
      this.accessToken = token;
      this.accessTokenExpiresAt = Date.now() + expiresIn * 1000;
      return token;
    }).finally(() => { this.tokenRequest = null; });
    return this.tokenRequest;
  }

  centralBranchId(localBranchId) {
    const mapped = this.config.branchMap[String(localBranchId)];
    if (mapped === undefined || mapped === null || mapped === "") {
      throw new AppError(`No Central Inventory mapping exists for MIS branch ${localBranchId}.`, {
        statusCode: 409,
        code: "CENTRAL_BRANCH_MAPPING_MISSING",
      });
    }
    // Zoho location IDs can exceed Number.MAX_SAFE_INTEGER; preserve them as
    // strings so branch filters retain the exact warehouse identifier.
    return String(mapped);
  }

  async request(method, path, { params, data, headers } = {}) {
    this.assertConfigured();
    try {
      const send = async (forceTokenRefresh = false) => {
        const token = await this.getAccessToken({ force: forceTokenRefresh });
        return this.transport.request({
          method,
          url: path,
          params,
          data,
          headers: {
            Authorization: `Bearer ${token}`,
            ...(data !== undefined ? { "Content-Type": "application/json" } : {}),
            ...headers,
          },
        });
      };
      let response;
      try {
        response = await send();
      } catch (error) {
        if (error.response?.status !== 401 || !(this.config.clientId && this.config.clientSecret)) throw error;
        this.accessToken = null;
        this.accessTokenExpiresAt = 0;
        response = await send(true);
      }
      return response.data;
    } catch (error) {
      if (error instanceof AppError) throw error;
      const status = Number(error.response?.status || 502);
      const remoteMessage = error.response?.data?.error?.message
        || error.response?.data?.message
        || (typeof error.response?.data?.error === "string" ? error.response.data.error : null);
      throw new AppError(remoteMessage || "Central Inventory request failed.", {
        statusCode: status >= 400 && status < 500 ? status : 502,
        code: "CENTRAL_INVENTORY_REQUEST_FAILED",
        details: [{ remoteStatus: error.response?.status || null, operation: `${method.toUpperCase()} ${path}` }],
      });
    }
  }

  submitInventoryRequest(input) { return this.request("post", "/requests", { data: input }); }
  getSerial(serial) { return this.request("get", `/serial/${encodeURIComponent(serial)}`); }
  listSerials(filters = {}) { return this.request("get", "/serials", { params: filters }); }
  listBranches() { return this.request("get", "/branches"); }
  listWarehouses() { return this.request("get", "/warehouses"); }
  warehouseStock(locationId, filters = {}) {
    return this.request("get", `/warehouses/${encodeURIComponent(locationId)}/stock`, { params: filters });
  }
  listKits(filters = {}) { return this.request("get", "/kits", { params: filters }); }
  getKit(id) { return this.request("get", `/kits/${encodeURIComponent(id)}`); }
  branchInventory({ localBranchId, status, search } = {}) {
    return this.request("get", "/branch-inventory", { params: {
      ...(localBranchId ? { branch: this.centralBranchId(localBranchId) } : {}),
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    } });
  }
  available({ sku, localBranchId }) {
    return this.request("get", "/available", {
      params: { sku, ...(localBranchId ? { branch: this.centralBranchId(localBranchId) } : {}) },
    });
  }
  allocate(input) {
    return this.request("post", "/allocate", {
      data: {
        ...input,
        branchId: this.centralBranchId(input.localBranchId),
        localBranchId: undefined,
        externalSystem: input.externalSystem || this.config.externalSystem,
      },
    });
  }
  requestReturn(input) {
    return this.request("post", "/return/request", {
      data: { ...input, externalSystem: input.externalSystem || this.config.externalSystem },
    });
  }
  transfer(input) {
    return this.request("post", "/transfer", {
      data: {
        serialId: input.serialId,
        fromBranchId: this.centralBranchId(input.fromLocalBranchId),
        toBranchId: this.centralBranchId(input.toLocalBranchId),
      },
    });
  }
  requestMissingInventory(input) {
    return this.request("post", "/notavailable/request", {
      data: {
        ...input,
        branchId: this.centralBranchId(input.localBranchId),
        localBranchId: undefined,
        externalSystem: input.externalSystem || this.config.externalSystem,
      },
    });
  }
  requestProcurement(input) {
    return this.request("post", "/procurement/request", {
      data: {
        ...input,
        branchId: this.centralBranchId(input.localBranchId),
        localBranchId: undefined,
      },
    });
  }
  approveProcurement(input) { return this.request("post", "/procurement/approve", { data: input }); }
  orderProcurement(input) { return this.request("post", "/procurement/order", { data: input }); }
  updateShipmentState(input) { return this.request("post", "/procurement/shipment-state", { data: input }); }
  completeProcurement(input) { return this.request("post", "/procurement/complete", { data: input }); }
  branchAnalytics(localBranchId) {
    return this.request("get", "/analytics/health", {
      params: localBranchId ? { branchId: this.centralBranchId(localBranchId) } : {},
    });
  }
  branchUsageAnalytics() { return this.request("get", "/analytics/branches"); }
  consumedAnalytics({ localBranchId, limit } = {}) {
    return this.request("get", "/analytics/consumed", {
      params: {
        ...(localBranchId ? { branchId: this.centralBranchId(localBranchId) } : {}),
        ...(limit ? { limit } : {}),
      },
    });
  }
  damagedAnalytics({ localBranchId } = {}) {
    return this.request("get", "/analytics/damaged", {
      params: localBranchId ? { branchId: this.centralBranchId(localBranchId) } : {},
    });
  }
}

const centralInventoryAdapter = new CentralInventoryAdapter();

module.exports = { CentralInventoryAdapter, centralInventoryAdapter };
