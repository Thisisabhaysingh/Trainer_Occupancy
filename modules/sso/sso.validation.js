const issue = (path, message) => ({ path: [path], message });
const result = (data, issues) => issues.length ? { success: false, error: { issues } } : { success: true, data };

const authorizeQuerySchema = {
  safeParse(value = {}) {
    const data = {
      client_id: String(value.client_id || ""),
      redirect_uri: String(value.redirect_uri || ""),
      response_type: String(value.response_type || ""),
      state: String(value.state || ""),
      code_challenge: String(value.code_challenge || ""),
      code_challenge_method: String(value.code_challenge_method || ""),
    };
    const issues = [];
    if (!data.client_id) issues.push(issue("client_id", "client_id is required"));
    if (!data.redirect_uri) issues.push(issue("redirect_uri", "redirect_uri is required"));
    if (data.response_type !== "code") issues.push(issue("response_type", "response_type must be code"));
    if (data.state.length < 32 || data.state.length > 512) issues.push(issue("state", "state must contain 32 to 512 characters"));
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(data.code_challenge)) issues.push(issue("code_challenge", "code_challenge must be a valid PKCE value"));
    if (data.code_challenge_method !== "S256") issues.push(issue("code_challenge_method", "only S256 is supported"));
    return result(data, issues);
  },
};

const tokenBodySchema = {
  safeParse(value = {}) {
    const data = {
      grant_type: String(value.grant_type || ""),
      client_id: String(value.client_id || ""),
      client_secret: String(value.client_secret || ""),
      code: String(value.code || ""),
      redirect_uri: String(value.redirect_uri || ""),
      code_verifier: String(value.code_verifier || ""),
    };
    const issues = [];
    if (data.grant_type !== "authorization_code") issues.push(issue("grant_type", "grant_type must be authorization_code"));
    if (!data.client_id) issues.push(issue("client_id", "client_id is required"));
    if (!data.client_secret) issues.push(issue("client_secret", "client_secret is required"));
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(data.code)) issues.push(issue("code", "authorization code is invalid"));
    if (!data.redirect_uri) issues.push(issue("redirect_uri", "redirect_uri is required"));
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(data.code_verifier)) issues.push(issue("code_verifier", "code_verifier must contain 43 to 128 PKCE characters"));
    return result(data, issues);
  },
};

module.exports = { authorizeQuerySchema, tokenBodySchema };
